import { describe, expect, it } from "vitest";
import { REGION_NA } from "../../src/content/region-na";
import { botCommands } from "../../src/sim/bot";
import { createWorld, DEFAULT_TUNING, hashWorld, step, type StepEvent, type World } from "../../src/sim/world";
import { decide, forecast, newMemory } from "../../tools/showcase/player";

/** Plays the showcase player the way the recorder does: one decision a second, and whenever a reward is open. */
function playTo(seed: string, seconds: number): { world: World; rejects: StepEvent[]; kinds: Set<string> } {
  const w = createWorld(seed, REGION_NA, DEFAULT_TUNING);
  const mem = newMemory(), sps = w.tuning.stepsPerSec;
  const rejects: StepEvent[] = [], kinds = new Set<string>();
  while (!w.over && w.step < seconds * sps) {
    const move = w.pendingReward || w.step % sps === 0 ? decide(w, mem) : null;
    if (move) kinds.add(move.kind);
    rejects.push(...step(w, move?.commands ?? []).filter(e => e.type === "reject"));
  }
  return { world: w, rejects, kinds };
}

describe("showcase player", () => {
  it("is still running, with nothing rejected, where the baseline bot has already lost", () => {
    const bot = createWorld("stage-2", REGION_NA, DEFAULT_TUNING);
    while (!bot.over && bot.step < 200 * bot.tuning.stepsPerSec) step(bot, botCommands(bot));
    expect(bot.over).toBe(true);

    const { world, rejects, kinds } = playTo("stage-2", 200);
    expect(world.over).toBe(false);
    expect(rejects).toEqual([]);
    expect(world.delivered).toBeGreaterThan(bot.delivered);
    for (const kind of ["connect", "reward", "redundancy"]) expect(kinds).toContain(kind);
  }, 60_000);

  it("forecasts on a copy: the real world is untouched, and an impossible command gives null", () => {
    const { world } = playTo("2328", 45);
    const before = hashWorld(world);
    const outlook = forecast(world, []);
    expect(outlook).not.toBeNull();
    expect(outlook!.drops).toBeGreaterThanOrEqual(0);
    expect(forecast(world, [{ type: "layLink", a: 1, b: 1 }])).toBeNull();
    expect(hashWorld(world)).toBe(before);
  });
});
