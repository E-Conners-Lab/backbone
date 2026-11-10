// The simulation. Pure logic: no DOM, no clock, no Math.random, no renderer (constitution C5).
// step() is the only function that advances time. Same world + same commands -> same world (R13).

import { pickNextHop, type Rotors } from "./forwarding";
import { advanceDir, enqueue, flushDir, newDir, type Dir, type Packet } from "./linkq";
import { nextFloat, nextInt, seedFromString, type RngState } from "./rng";
import { computeRoutes, isValidCost, type Routes } from "./spf";

// ---------- content and tuning ----------

export interface SiteDef { code: string; name: string; lon: number; lat: number; weight: number }
export interface Region { id: string; name: string; sites: SiteDef[] }

/** Play-balance constants (SPEC: "tunable"). Not rules. */
export interface Tuning {
  stepsPerSec: number;
  defaultCost: number;
  /** Packets per second per direction, by tier. */
  tiers: number[];
  queueLen: number;
  congestionAt: number;
  utilWindowSec: number;
  meterMax: number;
  drainPerSec: number;
  drainDelaySec: number;
  rewardEverySec: number;
  rewardFiberKm: number;
  graceSec: number;
  firstCutSec: number;
  cutGapSec: [number, number];
  cutDurationSec: [number, number];
  startFiberKm: number;
  startUpgrades: number;
  startSites: number;
  maxSites: number;
  siteEverySec: number;
  /** Per-site emission in thousandths of a packet per second, at weight 1. */
  baseRateMilli: number;
  rateGrowthMilliPerMin: number;
  /** How fast a pulse travels along a link. */
  kmPerSec: number;
  /** Equal-cost next hops each router keeps. 1 in v1 (SPEC F4, Q3). */
  maxPaths: number;
}

export const DEFAULT_TUNING: Tuning = {
  stepsPerSec: 20,
  defaultCost: 10,
  tiers: [4, 8, 16],
  queueLen: 8,
  congestionAt: 0.9,
  utilWindowSec: 2,
  meterMax: 100,
  drainPerSec: 1,
  drainDelaySec: 3,
  rewardEverySec: 60,
  rewardFiberKm: 3000,
  graceSec: 20,
  firstCutSec: 150,
  cutGapSec: [50, 80],
  cutDurationSec: [12, 25],
  startFiberKm: 8000,
  startUpgrades: 1,
  startSites: 3,
  maxSites: 12,
  siteEverySec: 40,
  baseRateMilli: 500,
  rateGrowthMilliPerMin: 200,
  kmPerSec: 1400,
  maxPaths: 1,
};

// ---------- state ----------

export interface Site {
  /** Router ID: 1, 2, 3... in order of appearance. */
  id: number;
  code: string;
  name: string;
  lon: number;
  lat: number;
  weight: number;
  appearStep: number;
  /** Starts sending and receiving at this step (grace period, R1 of the loop). */
  activeStep: number;
  /** Emission accumulator in milli-packets x stepsPerSec. */
  acc: number;
}

export interface Link {
  id: number;
  a: number;
  b: number;
  km: number;
  cost: number;
  tier: number;
  up: boolean;
  /** Step at which a cut link is restored; 0 when up. */
  restoreStep: number;
  /** dirs[0] carries a->b, dirs[1] carries b->a. Independent (R4). */
  dirs: [Dir, Dir];
}

export type RewardKind = "fiber" | "upgrade";
export type DropReason = "queue" | "cut" | "noroute";

export interface World {
  seedText: string;
  rng: RngState;
  tuning: Tuning;
  step: number;
  sites: Site[];
  links: Link[];
  nextLinkId: number;
  nextPacketId: number;
  routes: Routes;
  rotors: Rotors;
  fiberKm: number;
  upgrades: number;
  delivered: number;
  dropped: Record<DropReason, number>;
  /** Drop meter in thousandths of a drop. */
  meterMilli: number;
  lastDropStep: number;
  nextRewardStep: number;
  pendingReward: RewardKind[] | null;
  nextCutStep: number;
  over: boolean;
}

// ---------- commands ----------

export type Command =
  | { type: "layLink"; a: number; b: number }
  | { type: "removeLink"; link: number }
  | { type: "setCost"; link: number; cost: number }
  | { type: "upgrade"; link: number }
  | { type: "chooseReward"; choice: RewardKind };

export type RejectReason =
  | "game-over" | "unknown-site" | "same-site" | "duplicate-link" | "not-enough-fiber"
  | "unknown-link" | "link-is-cut" | "bad-cost" | "no-upgrades" | "max-tier" | "no-reward-pending" | "bad-choice";

export type StepEvent =
  | { type: "reject"; reason: RejectReason; command: Command }
  | { type: "linkLaid"; link: number }
  | { type: "linkRemoved"; link: number; a: number; b: number }
  | { type: "costSet"; link: number; cost: number }
  | { type: "upgraded"; link: number; tier: number }
  | { type: "rewardTaken"; choice: RewardKind }
  | { type: "rewardOffered" }
  | { type: "siteAppeared"; site: number }
  | { type: "siteActive"; site: number }
  | { type: "cut"; link: number; lost: number }
  | { type: "restored"; link: number }
  | { type: "rerouted" }
  | { type: "delivered"; at: number }
  | { type: "drop"; reason: DropReason; at: number; link?: number }
  | { type: "over" };

// ---------- helpers ----------

export function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
}

export const siteById = (w: World, id: number): Site | undefined => w.sites.find(s => s.id === id);
export const linkById = (w: World, id: number): Link | undefined => w.links.find(l => l.id === id);
export const linkBetween = (w: World, a: number, b: number): Link | undefined =>
  w.links.find(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
export const isPresent = (w: World, s: Site): boolean => s.appearStep <= w.step;
export const isActive = (w: World, s: Site): boolean => s.activeStep <= w.step;
export const presentSites = (w: World): Site[] => w.sites.filter(s => isPresent(w, s));
export const capacityOf = (w: World, l: Link): number => w.tuning.tiers[l.tier] ?? w.tuning.tiers[0]!;
export const linkKm = (w: World, a: number, b: number): number => {
  const sa = siteById(w, a), sb = siteById(w, b);
  return sa && sb ? haversineKm(sa.lon, sa.lat, sb.lon, sb.lat) : Infinity;
};

/** Utilization of one direction over the display window, 0..1 (R5). */
export function dirUtil(w: World, l: Link, d: 0 | 1): number {
  const windowSteps = l.dirs[d].hist.length;
  const max = capacityOf(w, l) * windowSteps / w.tuning.stepsPerSec;
  return max > 0 ? Math.min(1, l.dirs[d].histSum / max) : 0;
}
export const linkUtil = (w: World, l: Link): number => Math.max(dirUtil(w, l, 0), dirUtil(w, l, 1));

/** R8: an active site with no path to any other active site. */
export function isDark(w: World, s: Site): boolean {
  if (!isActive(w, s)) return false;
  const others = w.sites.filter(o => o.id !== s.id && isActive(w, o));
  if (others.length === 0) return false;
  const table = w.routes.get(s.id);
  return !others.some(o => table?.has(o.id));
}

export interface Score { score: number; seconds: number; time: string; dropped: number }
/** R12: score is packets delivered; time survived is recorded beside it. */
export function scoreOf(delivered: number, droppedTotal: number, steps: number, stepsPerSec: number): Score {
  const seconds = Math.floor(steps / stepsPerSec);
  return { score: delivered, seconds, time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, dropped: droppedTotal };
}
export const totalDropped = (w: World): number => w.dropped.queue + w.dropped.cut + w.dropped.noroute;
export const worldScore = (w: World): Score => scoreOf(w.delivered, totalDropped(w), w.step, w.tuning.stepsPerSec);

function recomputeRoutes(w: World): void {
  w.routes = computeRoutes(presentSites(w).map(s => s.id), w.links, w.tuning.maxPaths);
  w.rotors = {};
}

// ---------- creation ----------

export function createWorld(seedText: string, region: Region, tuning: Tuning = DEFAULT_TUNING): World {
  const rng: RngState = { s: seedFromString(`${region.id}:${seedText}`) };
  const sps = tuning.stepsPerSec;
  // Seeded shuffle decides which sites appear, and in what order.
  const pool = region.sites.map(s => ({ ...s }));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = nextInt(rng, 0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  const sites: Site[] = pool.slice(0, Math.min(tuning.maxSites, pool.length)).map((def, i) => {
    const appearStep = i < tuning.startSites ? 0 : (i - tuning.startSites + 1) * tuning.siteEverySec * sps;
    return { id: i + 1, ...def, appearStep, activeStep: appearStep + tuning.graceSec * sps, acc: 0 };
  });
  const w: World = {
    seedText, rng, tuning, step: 0, sites, links: [], nextLinkId: 1, nextPacketId: 1,
    routes: new Map(), rotors: {}, fiberKm: tuning.startFiberKm, upgrades: tuning.startUpgrades,
    delivered: 0, dropped: { queue: 0, cut: 0, noroute: 0 }, meterMilli: 0, lastDropStep: -1,
    nextRewardStep: tuning.rewardEverySec * sps, pendingReward: null,
    nextCutStep: tuning.firstCutSec * sps, over: false,
  };
  recomputeRoutes(w);
  return w;
}

// ---------- commands ----------

/** Validates and applies one command. Returns the events it caused; a rejection changes nothing. */
export function applyCommand(w: World, c: Command): StepEvent[] {
  const reject = (reason: RejectReason): StepEvent[] => [{ type: "reject", reason, command: c }];
  if (w.over) return reject("game-over");
  switch (c.type) {
    case "layLink": {
      const a = siteById(w, c.a), b = siteById(w, c.b);
      if (!a || !b || !isPresent(w, a) || !isPresent(w, b)) return reject("unknown-site");
      if (a.id === b.id) return reject("same-site");
      if (linkBetween(w, a.id, b.id)) return reject("duplicate-link");
      const km = haversineKm(a.lon, a.lat, b.lon, b.lat);
      if (km > w.fiberKm) return reject("not-enough-fiber");
      w.fiberKm -= km;
      const windowSteps = w.tuning.utilWindowSec * w.tuning.stepsPerSec;
      const link: Link = { id: w.nextLinkId++, a: Math.min(a.id, b.id), b: Math.max(a.id, b.id), km, cost: w.tuning.defaultCost,
        tier: 0, up: true, restoreStep: 0, dirs: [newDir(windowSteps), newDir(windowSteps)] };
      w.links.push(link);
      recomputeRoutes(w);
      return [{ type: "linkLaid", link: link.id }, { type: "rerouted" }];
    }
    case "removeLink": {
      const l = linkById(w, c.link);
      if (!l) return reject("unknown-link");
      // A cut link cannot be removed: removing and re-laying it would cancel the cut for free.
      if (!l.up) return reject("link-is-cut");
      const lost = flushDir(l.dirs[0]) + flushDir(l.dirs[1]);
      const out: StepEvent[] = [{ type: "linkRemoved", link: l.id, a: l.a, b: l.b }];
      for (let i = 0; i < lost; i++) out.push(...countDrop(w, "cut", l.a, l.id));
      w.fiberKm += l.km;
      w.links = w.links.filter(x => x.id !== l.id);
      recomputeRoutes(w);
      out.push({ type: "rerouted" });
      return out;
    }
    case "setCost": {
      const l = linkById(w, c.link);
      if (!l) return reject("unknown-link");
      if (!isValidCost(c.cost)) return reject("bad-cost");
      if (l.cost === c.cost) return [];
      l.cost = c.cost;
      recomputeRoutes(w);
      return [{ type: "costSet", link: l.id, cost: l.cost }, { type: "rerouted" }];
    }
    case "upgrade": {
      const l = linkById(w, c.link);
      if (!l) return reject("unknown-link");
      if (w.upgrades <= 0) return reject("no-upgrades");
      if (l.tier >= w.tuning.tiers.length - 1) return reject("max-tier");
      w.upgrades--;
      l.tier++;   // cost is deliberately unchanged (SPEC S6, AC8)
      return [{ type: "upgraded", link: l.id, tier: l.tier }];
    }
    case "chooseReward": {
      if (!w.pendingReward) return reject("no-reward-pending");
      if (!w.pendingReward.includes(c.choice)) return reject("bad-choice");
      if (c.choice === "fiber") w.fiberKm += w.tuning.rewardFiberKm; else w.upgrades++;
      w.pendingReward = null;
      return [{ type: "rewardTaken", choice: c.choice }];
    }
  }
}

// ---------- the step ----------

function countDrop(w: World, reason: DropReason, at: number, link?: number): StepEvent[] {
  w.dropped[reason]++;
  w.meterMilli += 1000;
  w.lastDropStep = w.step;
  return [{ type: "drop", reason, at, link }];
}

/** Sends a packet onward from router `at`, or delivers it, or drops it. */
function forward(w: World, p: Packet, at: number, out: StepEvent[]): void {
  if (at === p.dst) { w.delivered++; out.push({ type: "delivered", at }); return; }
  const next = pickNextHop(w.routes, w.rotors, at, p.dst);
  const link = next === undefined ? undefined : linkBetween(w, at, next);
  if (next === undefined || !link || !link.up) { out.push(...countDrop(w, "noroute", at)); return; }
  const dir = link.dirs[link.a === at ? 0 : 1];
  if (!enqueue(dir, p, w.tuning.queueLen)) out.push(...countDrop(w, "queue", at, link.id));
}

/**
 * Applies the commands, then advances exactly one step, unless the run is over or a reward
 * choice is pending (time stands still until the player chooses, R10).
 */
export function step(w: World, commands: readonly Command[] = []): StepEvent[] {
  const out: StepEvent[] = [];
  for (const c of commands) out.push(...applyCommand(w, c));
  if (w.over || w.pendingReward) return out;

  const t = w.tuning, sps = t.stepsPerSec;
  w.step++;
  let dirty = false;

  // 1. Scheduled events.
  for (const s of w.sites) {
    if (s.appearStep === w.step) { out.push({ type: "siteAppeared", site: s.id }); dirty = true; }
    if (s.activeStep === w.step) out.push({ type: "siteActive", site: s.id });
  }
  for (const l of w.links) {
    if (!l.up && l.restoreStep === w.step) { l.up = true; l.restoreStep = 0; dirty = true; out.push({ type: "restored", link: l.id }); }
  }
  if (w.step === w.nextCutStep) {
    const candidates = w.links.filter(l => l.up);
    if (candidates.length > 0) {
      const l = candidates[nextInt(w.rng, 0, candidates.length - 1)]!;
      l.up = false;
      l.restoreStep = w.step + nextInt(w.rng, t.cutDurationSec[0], t.cutDurationSec[1]) * sps;
      const lost = flushDir(l.dirs[0]) + flushDir(l.dirs[1]);
      out.push({ type: "cut", link: l.id, lost });
      for (let i = 0; i < lost; i++) out.push(...countDrop(w, "cut", l.a, l.id));
      dirty = true;
    }
    w.nextCutStep = w.step + nextInt(w.rng, t.cutGapSec[0], t.cutGapSec[1]) * sps;
  }

  // 2. Routes are recomputed before any packet is forwarded in this step (R1).
  if (dirty) { recomputeRoutes(w); out.push({ type: "rerouted" }); }

  // 3. Links: packets in flight move on; queued packets go on the wire.
  const arrivals: { p: Packet; at: number }[] = [];
  for (const l of w.links) {
    if (!l.up) continue;
    const flight = Math.max(2, Math.round(l.km / t.kmPerSec * sps));
    const cap = capacityOf(w, l);
    for (const p of advanceDir(l.dirs[0], w.step, cap, sps, flight)) arrivals.push({ p, at: l.b });
    for (const p of advanceDir(l.dirs[1], w.step, cap, sps, flight)) arrivals.push({ p, at: l.a });
  }

  // 4. Routers forward what arrived, each from its own table (F5).
  for (const { p, at } of arrivals) forward(w, p, at, out);

  // 5. Active sites emit new packets (R3).
  const active = w.sites.filter(s => isActive(w, s));
  if (active.length > 1) {
    const rateMilli = t.baseRateMilli + Math.floor(t.rateGrowthMilliPerMin * w.step / (60 * sps));
    for (const s of active) {
      s.acc += rateMilli * s.weight;
      while (s.acc >= 1000 * sps) {
        s.acc -= 1000 * sps;
        const others = active.filter(o => o.id !== s.id);
        let pick = nextFloat(w.rng) * others.reduce((sum, o) => sum + o.weight, 0);
        let dst = others[others.length - 1]!;
        for (const o of others) { pick -= o.weight; if (pick < 0) { dst = o; break; } }
        forward(w, { id: w.nextPacketId++, src: s.id, dst: dst.id, remain: 0, total: 0 }, s.id, out);
      }
    }
  }

  // 6. Drop meter (R7) and rewards (R10).
  if (w.meterMilli > 0 && w.step - w.lastDropStep > t.drainDelaySec * sps)
    w.meterMilli = Math.max(0, w.meterMilli - Math.round(1000 * t.drainPerSec / sps));
  if (w.meterMilli >= t.meterMax * 1000) { w.over = true; out.push({ type: "over" }); return out; }
  if (w.step === w.nextRewardStep) {
    w.pendingReward = ["fiber", "upgrade"];
    w.nextRewardStep += t.rewardEverySec * sps;
    out.push({ type: "rewardOffered" });
  }
  return out;
}

// ---------- determinism support ----------

/** FNV-1a hash of everything that affects the future of the run. */
export function hashWorld(w: World): string {
  const parts: (number | string)[] = [w.step, w.rng.s, w.fiberKm, w.upgrades, w.delivered, w.dropped.queue, w.dropped.cut,
    w.dropped.noroute, w.meterMilli, w.lastDropStep, w.nextRewardStep, w.pendingReward ? 1 : 0, w.nextCutStep, w.over ? 1 : 0, w.nextPacketId];
  for (const s of w.sites) parts.push(s.id, s.acc);
  for (const l of w.links) {
    parts.push(l.id, l.a, l.b, l.cost, l.tier, l.up ? 1 : 0, l.restoreStep);
    for (const d of l.dirs) {
      parts.push(d.credit, d.histSum, d.queue.length, d.flight.length);
      for (const p of d.queue) parts.push(p.id, p.dst);
      for (const p of d.flight) parts.push(p.id, p.dst, p.remain);
    }
  }
  for (const k of Object.keys(w.rotors).sort()) parts.push(k, w.rotors[k]!);
  const text = parts.join(",");
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const cloneWorld = (w: World): World => structuredClone(w);
