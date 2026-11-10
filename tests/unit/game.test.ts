import { describe, expect, it } from "vitest";
import { validateRegion, validateTuning } from "../../src/content/load";
import regionJson from "../../src/content/region-na.json";
import tuningJson from "../../src/content/tuning.json";
import type { Command, Reason } from "../../src/sim/types";
import { DEFAULT_LINK_COST, findLink, linkLength, presentSites } from "../../src/sim/world";
import { Game } from "../../src/ui/game";

// The run on screen: how commands reach the simulation while time stands still, because
// the game is paused (FR-024, AC14) or a reward is waiting to be chosen (FR-016).
// Both cases below were found in code review.

const tuning = validateTuning(tuningJson);
const region = validateRegion(regionJson, tuning.maxSites);

function newGame(overrides: Partial<typeof tuning> = {}): { game: Game; refused: { reason: Reason; command: Command }[] } {
  const refused: { reason: Reason; command: Command }[] = [];
  const game = new Game("stage-1", region, { ...tuning, ...overrides }, {
    onEvents: () => {},
    onRejected: (reason, command) => refused.push({ reason, command }),
  });
  return { game, refused };
}

/** A game stopped at its first reward offer, one second in, before any site sends traffic. */
function atReward(): ReturnType<typeof newGame> {
  const made = newGame({ rewardEverySec: 1 });
  made.game.advance(10 * tuning.stepsPerSec);
  expect(made.game.world.rewardPending).toBe(true);
  expect(made.game.world.step).toBe(tuning.stepsPerSec);
  return made;
}

describe("commands while a reward waits to be chosen (FR-016)", () => {
  it("are held as pending, checked against the world as it will be, and applied with the choice", () => {
    const { game, refused } = atReward();
    const [a, b, c] = presentSites(game.world) as [(typeof game.world.sites)[number], (typeof game.world.sites)[number], (typeof game.world.sites)[number]];
    const first = linkLength(a, b);
    game.world.fiberKm = first + 1; // enough for one link, not for two

    expect(game.holding).toBe(true);
    expect(game.issue({ type: "layLink", a: a.id, b: b.id })).toBeNull();
    // Nothing has reached the simulation; the change shows as pending.
    expect(game.world.links).toHaveLength(0);
    expect(game.pending.map((command) => command.type)).toEqual(["layLink"]);
    expect(game.planned.links).toHaveLength(1);
    expect(game.planned.fiberKm).toBe(1);

    // The second link is refused now, in words, not accepted and dropped after the choice.
    expect(game.issue({ type: "layLink", a: a.id, b: c.id })).toBe("not-enough-fiber");
    expect(game.pending).toHaveLength(1);

    // Three presses of "+" on the pending link's cost move it three steps, not one.
    const pendingLink = game.planned.links[0]!;
    for (let press = 0; press < 3; press++) {
      const cost = findLink(game.planned, a.id, b.id)!.cost + 1;
      expect(game.issue({ type: "setCost", link: pendingLink.id, cost })).toBeNull();
    }
    expect(findLink(game.planned, a.id, b.id)!.cost).toBe(DEFAULT_LINK_COST + 3);

    // Time has not moved, and the wait is still on.
    game.tick(1000);
    expect(game.world.step).toBe(tuning.stepsPerSec);
    expect(game.world.links).toHaveLength(0);

    expect(game.issue({ type: "chooseReward", choice: "fiber" })).toBeNull();
    expect(game.pending).toHaveLength(0);
    expect(game.projected).toBeNull();
    game.tick(0);

    const laid = findLink(game.world, a.id, b.id)!;
    expect(laid.id).toBe(pendingLink.id);
    expect(laid.cost).toBe(DEFAULT_LINK_COST + 3);
    expect(game.world.fiberKm).toBe(1 + tuning.rewardFiberKm);
    expect(game.world.rewardPending).toBe(false);
    expect(game.world.step).toBe(tuning.stepsPerSec + 1);
    expect(refused).toEqual([]);
    // The held changes went first and the choice last, all in the step that ended the wait.
    expect(game.log.map((entry) => `${entry.step}:${entry.command.type}`)).toEqual([
      `${tuning.stepsPerSec}:layLink`,
      `${tuning.stepsPerSec}:setCost`,
      `${tuning.stepsPerSec}:setCost`,
      `${tuning.stepsPerSec}:setCost`,
      `${tuning.stepsPerSec}:chooseReward`,
    ]);
  });

  it("go with the scripted player's choice too, so nothing stays held once time moves", () => {
    const { game, refused } = atReward();
    const [a, b] = presentSites(game.world);
    expect(game.issue({ type: "layLink", a: a!.id, b: b!.id })).toBeNull();
    game.bot = true;
    game.tick(0);
    expect(game.world.rewardPending).toBe(false);
    expect(findLink(game.world, a!.id, b!.id)).toBeDefined();
    expect(game.pending).toHaveLength(0);
    expect(game.projected).toBeNull();
    expect(refused).toEqual([]);
  });
});

describe("a command sent in the instant before a pause (AC14)", () => {
  it("joins the pending changes, so later pending changes land on the link they were made on", () => {
    const { game, refused } = newGame();
    game.advance(5);
    game.world.fiberKm = 1_000_000;
    const [a, b, c] = presentSites(game.world);

    // Sent while running, and not yet applied when the pause arrives.
    expect(game.issue({ type: "layLink", a: a!.id, b: b!.id })).toBeNull();
    game.setPaused(true);
    expect(game.world.links).toHaveLength(0);
    expect(game.pending.map((command) => command.type)).toEqual(["layLink"]);
    expect(game.planned.fiberKm).toBe(1_000_000 - linkLength(a!, b!));

    // A second link, and a cost set on that second link, while paused.
    expect(game.issue({ type: "layLink", a: b!.id, b: c!.id })).toBeNull();
    const second = findLink(game.planned, b!.id, c!.id)!;
    expect(game.issue({ type: "setCost", link: second.id, cost: 50 })).toBeNull();

    game.setPaused(false);
    game.advance(1);
    expect(findLink(game.world, b!.id, c!.id)).toMatchObject({ id: second.id, cost: 50 });
    expect(findLink(game.world, a!.id, b!.id)!.cost).toBe(DEFAULT_LINK_COST);
    expect(refused).toEqual([]);
  });

  it("is refused in words at the pause if an earlier queued command already spent what it needs", () => {
    const { game, refused } = newGame();
    game.advance(5);
    const [a, b, c] = presentSites(game.world);
    game.world.fiberKm = Math.max(linkLength(a!, b!), linkLength(a!, c!));
    // Each is affordable alone, so each is accepted while running; together they are not.
    expect(game.issue({ type: "layLink", a: a!.id, b: b!.id })).toBeNull();
    expect(game.issue({ type: "layLink", a: a!.id, b: c!.id })).toBeNull();
    game.setPaused(true);
    expect(game.pending).toHaveLength(1);
    expect(refused.map((r) => r.reason)).toEqual(["not-enough-fiber"]);
  });
});
