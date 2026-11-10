import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import fixtures from "../fixtures/ospf-cases.json";
import { REGION_NA } from "../../src/content/region-na";
import { botCommands } from "../../src/sim/bot";
import { advanceDir, enqueue, newDir } from "../../src/sim/linkq";
import { replay, type LoggedCommand } from "../../src/sim/replay";
import { applyCommand, createWorld, DEFAULT_TUNING, hashWorld, isDark, linkBetween, linkUtil, scoreOf, step, totalDropped,
  type Command, type Region, type StepEvent, type Tuning, type World } from "../../src/sim/world";

// A five-site region shaped like spec topology T1. Sites are close together so fiber is never short.
const T1_REGION: Region = { id: "t1", name: "T1", sites: [
  { code: "A", name: "A", lon: 0, lat: 0, weight: 1 }, { code: "B", name: "B", lon: 1, lat: 1, weight: 1 },
  { code: "C", name: "C", lon: 2, lat: 0, weight: 1 }, { code: "D", name: "D", lon: 1, lat: -1, weight: 1 },
  { code: "E", name: "E", lon: 3, lat: 0, weight: 1 } ] };
const QUIET: Tuning = { ...DEFAULT_TUNING, startSites: 5, maxSites: 5, graceSec: 0, firstCutSec: 1e6, rewardEverySec: 1e6,
  startFiberKm: 1e6, drainDelaySec: 1e6, meterMax: 1e9, baseRateMilli: 600, rateGrowthMilliPerMin: 0 };

function t1World(tuning: Tuning = QUIET): { w: World; id: Record<string, number> } {
  const w = createWorld("t1", T1_REGION, tuning);
  const id = Object.fromEntries(w.sites.map(s => [s.code, s.id]));
  const lay = (a: string, b: string, cost: number): void => {
    expect(applyCommand(w, { type: "layLink", a: id[a]!, b: id[b]! })[0]!.type).toBe("linkLaid");
    applyCommand(w, { type: "setCost", link: linkBetween(w, id[a]!, id[b]!)!.id, cost });
  };
  for (const [a, b, c] of fixtures.topologies.T1.links) lay(a as string, b as string, c as number);
  return { w, id };
}
const run = (w: World, steps: number, events: StepEvent[] = []): StepEvent[] => { for (let i = 0; i < steps; i++) events.push(...step(w)); return events; };
const served = (w: World, a: number, b: number): number => { const l = linkBetween(w, a, b)!; return l.dirs[0].histSum + l.dirs[1].histSum; };

describe("spec case 9: overload on one link direction", () => {
  it("60 offered = 40 served + 8 queued + 12 dropped", () => {
    const o = fixtures.overload, sps = 20;
    const dir = newDir(40);
    let acc = 0, offered = 0, dropped = 0, servedCount = 0, id = 0;
    for (let s = 1; s <= o.seconds * sps; s++) {
      const before = dir.flight.length;
      const arrived = advanceDir(dir, s, o.capacityPerSec, sps, 3).length;
      servedCount += dir.flight.length - before + arrived;
      acc += o.offeredPerSec;
      while (acc >= sps) { acc -= sps; offered++; if (!enqueue(dir, { id: id++, src: 1, dst: 2, remain: 0, total: 0 }, o.queueLen)) dropped++; }
    }
    expect({ offered, served: servedCount, queued: dir.queue.length, dropped }).toEqual(o.expect);
    expect(dir.dropped).toBe(o.expect.dropped);
  });
});

describe("spec case 11: score", () => {
  it("score is packets delivered; time is shown beside it", () => {
    const s = fixtures.score;
    const got = scoreOf(s.delivered, s.dropped, s.seconds * 20, 20);
    expect({ score: got.score, time: got.time }).toEqual(s.expect);
  });
});

describe("traffic follows cost in a running world (AC3, AC4, AC8)", () => {
  it("at cost 25 the direct A-C link carries nothing; at 19 it carries A's traffic to C and E", () => {
    const { w, id } = t1World();
    run(w, 600);
    expect(w.delivered).toBeGreaterThan(50);
    expect(served(w, id.A!, id.C!)).toBe(0);
    const ac = linkBetween(w, id.A!, id.C!)!;
    step(w, [{ type: "setCost", link: ac.id, cost: 19 }]);
    run(w, 200);
    expect(served(w, id.A!, id.C!)).toBeGreaterThan(0);
    // Nothing bound for C or E may still be entering A-B or A-D from A.
    for (const far of ["B", "D"]) {
      const l = linkBetween(w, id.A!, id[far]!)!;
      const fromA = l.dirs[l.a === id.A ? 0 : 1];
      for (const p of [...fromA.queue, ...fromA.flight]) expect([id.C, id.E]).not.toContain(p.dst);
    }
  });

  it("a capacity upgrade raises the tier and leaves the cost alone", () => {
    const { w, id } = t1World({ ...QUIET, startUpgrades: 1 });
    const ac = linkBetween(w, id.A!, id.C!)!;
    const before = hashRoutes(w);
    expect(applyCommand(w, { type: "upgrade", link: ac.id })).toEqual([{ type: "upgraded", link: ac.id, tier: 1 }]);
    expect(ac.cost).toBe(25);
    expect(hashRoutes(w)).toBe(before);
    expect(applyCommand(w, { type: "upgrade", link: ac.id })[0]).toMatchObject({ type: "reject", reason: "no-upgrades" });
  });
});
const hashRoutes = (w: World): string => JSON.stringify([...w.routes].map(([k, v]) => [k, [...v]]));

describe("commands are validated; a rejection changes nothing (AC5, case 10)", () => {
  it("rejects each invalid command with a reason and leaves the world hash unchanged", () => {
    const { w, id } = t1World({ ...QUIET, startUpgrades: 0 });
    const ab = linkBetween(w, id.A!, id.B!)!.id;
    w.fiberKm = 10;
    const bad: [Command, string][] = [
      [{ type: "layLink", a: id.A!, b: id.A! }, "same-site"],
      [{ type: "layLink", a: id.A!, b: id.B! }, "duplicate-link"],
      [{ type: "layLink", a: id.B!, b: id.E! }, "not-enough-fiber"],
      [{ type: "layLink", a: id.A!, b: 99 }, "unknown-site"],
      [{ type: "setCost", link: ab, cost: 0 }, "bad-cost"],
      [{ type: "setCost", link: ab, cost: 65536 }, "bad-cost"],
      [{ type: "setCost", link: ab, cost: 2.5 }, "bad-cost"],
      [{ type: "setCost", link: 999, cost: 5 }, "unknown-link"],
      [{ type: "upgrade", link: ab }, "no-upgrades"],
      [{ type: "removeLink", link: 999 }, "unknown-link"],
      [{ type: "chooseReward", choice: "fiber" }, "no-reward-pending"],
    ];
    const before = hashWorld(w), routes = hashRoutes(w);
    for (const [c, reason] of bad) expect(applyCommand(w, c), JSON.stringify(c)).toEqual([{ type: "reject", reason, command: c }]);
    expect(hashWorld(w)).toBe(before);
    expect(hashRoutes(w)).toBe(routes);
  });

  it("a cut link cannot be removed, so a cut cannot be cancelled by re-laying the link", () => {
    const { w, id } = t1World();
    const l = linkBetween(w, id.A!, id.C!)!;
    l.up = false; l.restoreStep = w.step + 100;
    const before = hashWorld(w);
    expect(applyCommand(w, { type: "removeLink", link: l.id })[0]).toMatchObject({ type: "reject", reason: "link-is-cut" });
    expect(hashWorld(w)).toBe(before);
  });

  it("removing a link returns its fiber in full (Q5)", () => {
    const { w, id } = t1World();
    const l = linkBetween(w, id.A!, id.C!)!;
    const fiber = w.fiberKm;
    applyCommand(w, { type: "removeLink", link: l.id });
    expect(w.fiberKm).toBe(fiber + l.km);
    expect(linkBetween(w, id.A!, id.C!)).toBeUndefined();
  });
});

describe("drops, the meter, cuts and dark sites (R6-R8, R11, AC7, AC9, AC10)", () => {
  it("the meter rises by exactly one per dropped packet", () => {
    const { w } = t1World({ ...QUIET, baseRateMilli: 6000 });   // far more than the links can carry
    const events = run(w, 400);
    const drops = events.filter(e => e.type === "drop").length;
    expect(drops).toBeGreaterThan(20);
    expect(totalDropped(w)).toBe(drops);
    expect(w.meterMilli).toBe(drops * 1000);
  });

  it("the meter drains only after a quiet period, and a full meter ends the run", () => {
    const { w } = t1World({ ...QUIET, drainDelaySec: 3, drainPerSec: 1 });
    w.meterMilli = 5000; w.lastDropStep = w.step;
    run(w, 60); expect(w.meterMilli).toBe(5000);
    run(w, 40); expect(w.meterMilli).toBe(5000 - 40 * 50);
    const full = t1World({ ...QUIET, baseRateMilli: 6000, meterMax: 30 }).w;
    const events = run(full, 2000);
    expect(full.over).toBe(true);
    expect(events.at(-1)).toEqual({ type: "over" });
    const frozen = hashWorld(full);
    step(full); expect(hashWorld(full)).toBe(frozen);
  });

  it("a cut loses the packets on the link, darkens stranded sites, and restores later", () => {
    // Far apart, so packets are always in flight on the link when it is cut.
    const two: Region = { id: "two", name: "two", sites: [
      { code: "W", name: "W", lon: 0, lat: 0, weight: 1 }, { code: "X", name: "X", lon: 30, lat: 0, weight: 1 } ] };
    const w = createWorld("cut", two, { ...QUIET, startSites: 2, maxSites: 2, firstCutSec: 10, cutDurationSec: [5, 5], cutGapSec: [1000, 1000], baseRateMilli: 2000 });
    applyCommand(w, { type: "layLink", a: 1, b: 2 });
    run(w, 199);
    const link = w.links[0]!;
    const onLink = link.dirs.reduce((n, d) => n + d.queue.length + d.flight.length, 0);
    expect(onLink).toBeGreaterThan(0);
    const delivered = w.delivered;
    const events = step(w);                                   // step 200 = 10 s: the cut
    expect(events).toContainEqual({ type: "cut", link: link.id, lost: onLink });
    expect(events).toContainEqual({ type: "rerouted" });
    expect(w.dropped.cut).toBe(onLink);
    expect(link.up).toBe(false);
    expect(linkUtil(w, link)).toBe(0);                        // a dead link reports no load
    expect(w.sites.every(s => isDark(w, s))).toBe(true);
    run(w, 99);
    expect(w.delivered).toBe(delivered);                      // nothing gets through
    expect(w.dropped.noroute).toBeGreaterThan(0);
    const back = step(w);                                     // step 300: restored
    expect(back).toContainEqual({ type: "restored", link: link.id });
    expect(w.sites.some(s => isDark(w, s))).toBe(false);
    run(w, 100);
    expect(w.delivered).toBeGreaterThan(delivered);
  });

  it("spec case 8 in a running world: with C-E down, E is dark and the others are not", () => {
    const { w, id } = t1World();
    const ce = linkBetween(w, id.C!, id.E!)!;
    applyCommand(w, { type: "removeLink", link: ce.id });
    run(w, 100);
    for (const s of w.sites) expect(isDark(w, s), s.code).toBe(s.code === "E");
    expect(w.dropped.noroute).toBeGreaterThan(0);
  });
});

describe("rewards stop the clock until chosen (R10)", () => {
  it("offers at the interval, waits, then applies the choice", () => {
    const { w } = t1World({ ...QUIET, rewardEverySec: 2, rewardFiberKm: 500, startUpgrades: 0 });
    const events = run(w, 40);
    expect(events.at(-1)).toEqual({ type: "rewardOffered" });
    step(w); step(w);
    expect(w.step).toBe(40);
    const fiber = w.fiberKm;
    step(w, [{ type: "chooseReward", choice: "fiber" }]);
    expect(w.fiberKm).toBe(fiber + 500);
    expect(w.step).toBe(41);
    run(w, 39); step(w, [{ type: "chooseReward", choice: "upgrade" }]);
    expect(w.upgrades).toBe(1);
  });
});

describe("spec case 12: determinism and replay (R13, R14)", () => {
  const play = (seed: string, maxSteps: number): { w: World; hashes: string[]; log: LoggedCommand[] } => {
    const w = createWorld(seed, REGION_NA);
    const hashes: string[] = [], log: LoggedCommand[] = [];
    for (let i = 0; i < maxSteps && !w.over; i++) {
      const commands = botCommands(w);
      for (const command of commands) log.push({ at: w.step, command });
      step(w, commands);
      hashes.push(hashWorld(w));
    }
    return { w, hashes, log };
  };

  it("same seed and commands give an identical state at every step", () => {
    const a = play("stage-1", 6000), b = play("stage-1", 6000);
    expect(a.hashes.length).toBeGreaterThan(1000);
    expect(b.hashes).toEqual(a.hashes);
    expect(play("stage-2", 3000).hashes.slice(0, 3000)).not.toEqual(a.hashes.slice(0, 3000));
  });

  it("re-simulating the command log reproduces the run exactly", () => {
    const a = play("replay-me", 5000);
    const w = replay({ seedText: "replay-me", regionId: "na", log: a.log, finalStep: a.w.step }, REGION_NA, DEFAULT_TUNING);
    expect(hashWorld(w)).toBe(hashWorld(a.w));
    expect(w.delivered).toBe(a.w.delivered);
  });

  it("a scripted run reaches game over with a score", () => {
    const a = play("stage-1", 20 * 60 * 30);
    expect(a.w.over).toBe(true);
    expect(a.w.delivered).toBeGreaterThan(100);
  });
});

describe("the simulation is pure (constitution C5)", () => {
  it("src/sim uses no DOM, clock, Math.random or renderer", () => {
    const dir = join(import.meta.dirname, "../../src/sim");
    const files = readdirSync(dir).filter(f => f.endsWith(".ts"));
    expect(files.length).toBeGreaterThan(5);
    const banned = [/Math\.random/, /\bDate\b/, /performance\./, /\bdocument\b/, /\bwindow\b/, /requestAnimationFrame/, /setTimeout|setInterval/,
      /from "\.\.\/(render|ui|audio)/, /localStorage/];
    for (const f of files) {
      const code = readFileSync(join(dir, f), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const re of banned) expect(re.test(code), `${f} matches ${re}`).toBe(false);
    }
  });
});
