// The showcase player: a stronger scripted player than src/sim/bot.ts, used to record a long,
// captioned demonstration run. Like the bot it only looks at the world and returns commands.
//
// What makes it play well is the same thing the game asks of a person: before changing anything
// it predicts where the load will go. It does that by running a copy of the simulation forward a
// few seconds. The copy is deliberately blind to the real future: its random numbers are
// scrambled, no fiber cut is scheduled in it, and sites that have not appeared yet never do. So
// it forecasts expected traffic on the network as it stands, which is what a player can reason
// about, and cannot peek at the next cut or the next city.

import { applyCommand, capacityOf, cloneWorld, isActive, isPresent, linkBetween, linkKm, linkUtil, presentSites, siteById, step,
  totalDropped, type Command, type Link, type World } from "../../src/sim/world";
import { isValidCost } from "../../src/sim/spf";

export type MoveKind = "reward" | "connect" | "rescue" | "reclaim" | "upgrade" | "redundancy" | "retune";

export interface Move {
  kind: MoveKind;
  commands: Command[];
  /** One or two short sentences for the on-screen caption: what was seen and why this answers it. */
  why: string;
}

export interface PlayerMemory {
  lastRetuneStep: number;
  lastHealthStep: number;
  /** What the reward just taken was chosen for; played as the next move. */
  planned: Move | null;
}
export const newMemory = (): PlayerMemory => ({ lastRetuneStep: -1e9, lastHealthStep: -1e9, planned: null });

export interface Outlook { drops: number; queue: number; value: number }

const SALTS = [0x9e3779b9, 0x7f4a7c15];
const FORECAST_SEC = 20;
/** Forecast with a little more traffic than now, so the player acts before a link fills. */
const STRESS_MILLI = 100;
const COST_DELTAS = [-5, -2, -1, 1, 2, 5, 10];

const code = (w: World, id: number): string => siteById(w, id)?.code ?? "?";
const linkName = (w: World, l: Pick<Link, "a" | "b">): string => `${code(w, l.a)}–${code(w, l.b)}`;
const queued = (l: Link): number => l.dirs[0].queue.length + l.dirs[1].queue.length;
const pct = (x: number): string => `${Math.round(x * 100)}%`;
const km = (n: number): string => `${n.toLocaleString("en-US")} km`;

/**
 * Predicted drops and queueing over the next `seconds`, after applying `commands`.
 * Null when a command would be rejected.
 */
export function forecast(w: World, commands: readonly Command[], seconds = FORECAST_SEC, stressMilli = STRESS_MILLI): Outlook | null {
  let drops = 0, queue = 0;
  for (const salt of SALTS) {
    const f = cloneWorld(w);
    f.rng.s = (f.rng.s ^ salt) >>> 0;
    f.nextCutStep = Infinity;
    f.nextRewardStep = Infinity;
    f.pendingReward = null;
    f.tuning.baseRateMilli += stressMilli;
    for (const s of f.sites) if (s.appearStep > f.step) { s.appearStep = Infinity; s.activeStep = Infinity; }
    // How long a repair takes is not known to the player: assume a cut link stays down.
    for (const l of f.links) if (!l.up) l.restoreStep = Infinity;
    for (const c of commands) if (applyCommand(f, c).some(e => e.type === "reject")) return null;
    const before = totalDropped(f);
    let q = 0, samples = 0;
    const steps = seconds * f.tuning.stepsPerSec;
    for (let i = 0; i < steps && !f.over; i++) {
      step(f);
      if (i % 4 === 0) { for (const l of f.links) q += queued(l); samples++; }
    }
    drops += totalDropped(f) - before;
    queue += samples > 0 ? q / samples : 0;
  }
  drops /= SALTS.length; queue /= SALTS.length;
  return { drops, queue, value: drops * 10 + queue };
}

/** Groups of present sites joined by links. `upOnly` ignores cut links (what traffic can use now). */
function components(w: World, upOnly: boolean, without?: Link): number[][] {
  const ids = presentSites(w).map(s => s.id);
  const group = new Map<number, number>(ids.map(id => [id, id]));
  const find = (x: number): number => { let r = x; while (group.get(r) !== r) r = group.get(r)!; return r; };
  for (const l of w.links) {
    if (l === without || (upOnly && !l.up)) continue;
    group.set(find(l.a), find(l.b));
  }
  const out = new Map<number, number[]>();
  for (const id of ids) { const r = find(id); out.set(r, [...(out.get(r) ?? []), id]); }
  return [...out.values()];
}

interface Candidate { a: number; b: number; km: number }

/** The shortest new link that joins two different groups. */
function shortestJoin(w: World, groups: number[][]): Candidate | undefined {
  let best: Candidate | undefined;
  for (let i = 0; i < groups.length; i++) for (let j = i + 1; j < groups.length; j++)
    for (const a of groups[i]!) for (const b of groups[j]!) {
      if (linkBetween(w, a, b)) continue;
      const d = linkKm(w, a, b);
      if (!best || d < best.km) best = { a, b, km: d };
    }
  return best;
}

/** Links whose loss would split the network (single points of failure), with the cheapest fix for each. */
function bridgeFixes(w: World): { bridge: Link; fix: Candidate }[] {
  const whole = components(w, false).length;
  const out: { bridge: Link; fix: Candidate }[] = [];
  for (const l of w.links) {
    const parts = components(w, false, l);
    if (parts.length === whole) continue;
    const sideA = parts.find(p => p.includes(l.a))!, sideB = parts.find(p => p.includes(l.b))!;
    const fix = shortestJoin(w, [sideA, sideB]);
    if (fix) out.push({ bridge: l, fix });
  }
  return out;
}

const sitesToCome = (w: World): number => w.sites.filter(s => !isPresent(w, s)).length;
/** Fiber kept back so the next new site can still be connected. */
const reserveKm = (w: World): number => (sitesToCome(w) > 0 ? 2000 : 0);

function busiest(w: World): Link | undefined {
  return w.links.filter(l => l.up && l.tier < w.tuning.tiers.length - 1)
    .sort((x, y) => (linkUtil(w, y) + queued(y) / 16) - (linkUtil(w, x) + queued(x) / 16) || x.id - y.id)[0];
}

/** How many site-to-site routes use a different next hop somewhere once `commands` apply. */
function routesMoved(w: World, commands: readonly Command[]): number {
  const f = cloneWorld(w);
  for (const c of commands) applyCommand(f, c);
  let moved = 0;
  for (const [from, table] of w.routes) for (const [to, r] of table) {
    const after = f.routes.get(from)?.get(to);
    if (!after || after.nextHops[0] !== r.nextHops[0]) moved++;
  }
  return moved;
}

const REWARD_SEC = 30;
/** Rewards are judged against the traffic of about a minute from now, when the next one arrives. */
const REWARD_STRESS_MILLI = 200;

/** Picks the reward by forecasting both: the best upgrade against the best links 3,000 km would buy. */
function chooseReward(w: World, mem: PlayerMemory, split: number[][], fixes: { bridge: Link; fix: Candidate }[], reserve: number): Move {
  const fiber = (why: string, planned: Move | null = null): Move => { mem.planned = planned; return { kind: "reward", commands: [{ type: "chooseReward", choice: "fiber" }], why }; };
  const join = split.length > 1 ? shortestJoin(w, split) : undefined;
  if (join && join.km > w.fiberKm) return fiber(`Reward: fiber. A site is cut off and ${km(w.fiberKm)} is not enough to reach it.`);
  if (sitesToCome(w) > 0 && w.fiberKm < reserve) return fiber(`Reward: fiber. More sites are coming and only ${km(w.fiberKm)} is left to connect them.`);

  const look = (g: World, commands: Command[]): Outlook | null => forecast(g, commands, REWARD_SEC, REWARD_STRESS_MILLI);
  const withUpgrade = cloneWorld(w); withUpgrade.pendingReward = null; withUpgrade.upgrades++;
  const withFiber = cloneWorld(w); withFiber.pendingReward = null; withFiber.fiberKm += w.tuning.rewardFiberKm;
  // A site with no path yet gets its shortest link in either case, so it does not skew the comparison.
  if (join) for (const g of [withUpgrade, withFiber]) applyCommand(g, { type: "layLink", a: join.a, b: join.b });
  const base = look(withFiber, [])!;

  let bestUp: { o: Outlook; l: Link } | undefined;
  const upgradeable = w.links.filter(l => l.up && l.tier < w.tuning.tiers.length - 1)
    .sort((x, y) => (linkUtil(w, y) + queued(y) / 16) - (linkUtil(w, x) + queued(x) / 16) || x.id - y.id).slice(0, 4);
  for (const l of upgradeable) {
    const o = look(withUpgrade, [{ type: "upgrade", link: l.id }]);
    if (o && (!bestUp || o.value < bestUp.o.value)) bestUp = { o, l };
  }

  let bestLink: { o: Outlook; c: Candidate } | undefined;
  const present = presentSites(w);
  for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
    const a = present[i]!.id, b = present[j]!.id, d = linkKm(w, a, b);
    if (linkBetween(withFiber, a, b) || d > withFiber.fiberKm - reserve) continue;
    const o = look(withFiber, [{ type: "layLink", a, b }]);
    if (o && (!bestLink || o.value < bestLink.o.value)) bestLink = { o, c: { a, b, km: d } };
  }

  const calm = base.value < 1;
  if (calm || !bestUp) {
    const wantFiber = sitesToCome(w) > 0 || fixes.length > 0 || !bestUp;
    if (wantFiber) return fiber(`Reward: fiber. ${calm ? "No congestion is forecast" : "Every busy link is at full capacity"}, so bank fiber for ${sitesToCome(w) > 0 ? "the sites still to come" : "more paths"}.`);
    return { kind: "reward", commands: [{ type: "chooseReward", choice: "upgrade" }], why: "Reward: upgrade. No congestion is forecast and the mesh is redundant, so bank an upgrade for when a link fills." };
  }
  if (bestLink && bestLink.o.value < bestUp.o.value) {
    const c = bestLink.c;
    return fiber(`Reward: fiber. Forecast for the next ${REWARD_SEC} s: a new ${code(w, c.a)}–${code(w, c.b)} link leaves ${Math.round(bestLink.o.drops)} drops, the best upgrade (${linkName(w, bestUp.l)}) leaves ${Math.round(bestUp.o.drops)}.`,
      { kind: "redundancy", commands: [{ type: "layLink", a: c.a, b: c.b }], why: `Lay ${code(w, c.a)}–${code(w, c.b)} (${km(c.km)}): the new path the reward was taken for. It takes load off the congested links.` });
  }
  const l = bestUp.l;
  mem.planned = { kind: "upgrade", commands: [{ type: "upgrade", link: l.id }],
    why: `Upgrade ${linkName(w, l)} ${capacityOf(w, l)}→${w.tuning.tiers[l.tier + 1]} pkt/s, at ${pct(linkUtil(w, l))}. Its cost stays ${l.cost}, so routes do not move: only the bottleneck widens.` };
  return { kind: "reward", commands: [{ type: "chooseReward", choice: "upgrade" }],
    why: `Reward: upgrade. Forecast for the next ${REWARD_SEC} s: upgrading ${linkName(w, l)} leaves ${Math.round(bestUp.o.drops)} drops, against ${Math.round(bestLink?.o.drops ?? base.drops)} for the best use of 3,000 km of fiber.` };
}

/** The next move, or null when the network should be left alone. Call about once a second, and whenever a reward is pending. */
export function decide(w: World, mem: PlayerMemory): Move | null {
  if (w.over) return null;
  const sps = w.tuning.stepsPerSec;
  const split = components(w, true);
  const fixes = bridgeFixes(w);
  const reserve = reserveKm(w);

  if (w.pendingReward) return chooseReward(w, mem, split, fixes, reserve);

  if (mem.planned) {
    const planned = mem.planned;
    mem.planned = null;
    if (forecast(w, planned.commands, 1) !== null) return planned;   // still possible (a cut may have got in the way)
  }

  // 1. A site with no working path: a new site, or one a fiber cut left dark.
  if (split.length > 1) {
    const join = shortestJoin(w, split);
    if (join && join.km <= w.fiberKm) {
      const fresh = [join.a, join.b].find(id => !w.links.some(l => l.a === id || l.b === id));
      const cmd: Command = { type: "layLink", a: join.a, b: join.b };
      if (fresh !== undefined) {
        const s = siteById(w, fresh)!;
        return { kind: "connect", commands: [cmd],
          why: `${s.name} has no link. Lay ${code(w, join.a)}–${code(w, join.b)} (${km(join.km)}), its shortest way in${isActive(w, s) ? "" : ", before it starts sending"}.` };
      }
      return { kind: "rescue", commands: [cmd],
        why: `A cut has split the network. Lay ${code(w, join.a)}–${code(w, join.b)} (${km(join.km)}) to restore a path now, and keep it as a second way in.` };
    }
  }

  // 1b. No fiber for that link: take back a link the network can spare and reuse its fiber.
  if (split.length > 1) {
    const join = shortestJoin(w, split);
    const upGroups = split.length;
    const spare = join && w.links
      .filter(l => l.up && l.km + w.fiberKm >= join.km && components(w, true, l).length === upGroups)
      .sort((x, y) => linkUtil(w, x) - linkUtil(w, y) || x.km - y.km)[0];
    if (join && spare)
      return { kind: "reclaim", commands: [{ type: "removeLink", link: spare.id }, { type: "layLink", a: join.a, b: join.b }],
        why: `${code(w, join.a)}–${code(w, join.b)} needs ${km(join.km)} and only ${km(w.fiberKm)} is left. Remove ${linkName(w, spare)} (${pct(linkUtil(w, spare))} used, and not the only path anywhere) to get its ${km(spare.km)} back, then lay the link.` };
  }

  // 2. Spend an upgrade where the load is.
  if (w.upgrades > 0) {
    const hot = busiest(w);
    if (hot && linkUtil(w, hot) >= 0.7)
      return { kind: "upgrade", commands: [{ type: "upgrade", link: hot.id }],
        why: `${linkName(w, hot)} is the busiest link at ${pct(linkUtil(w, hot))}. Upgrade it ${capacityOf(w, hot)}→${w.tuning.tiers[hot.tier + 1]} pkt/s. Its cost stays ${hot.cost}, so routes do not move.` };
  }

  // 3. Remove single points of failure, cheapest first.
  const affordable = fixes.filter(f => f.fix.km <= w.fiberKm - reserve).sort((x, y) => x.fix.km - y.fix.km)[0];
  if (affordable)
    return { kind: "redundancy", commands: [{ type: "layLink", a: affordable.fix.a, b: affordable.fix.b }],
      why: `If ${linkName(w, affordable.bridge)} were cut, sites would go dark. Lay ${code(w, affordable.fix.a)}–${code(w, affordable.fix.b)} (${km(affordable.fix.km)}) as a second path.` };

  // 4. Congestion, now or forecast: move load with costs, or add a path if there is fiber for one.
  if (w.step - mem.lastRetuneStep < 9 * sps) return null;
  const hotNow = w.links.filter(l => l.up && (linkUtil(w, l) >= 0.85 || Math.max(l.dirs[0].queue.length, l.dirs[1].queue.length) >= 4));
  if (hotNow.length === 0 && w.step - mem.lastHealthStep < 10 * sps) return null;
  mem.lastHealthStep = w.step;
  const base = forecast(w, []);
  if (!base || base.value < 1) return null;

  const commands: Command[] = [];
  const notes: string[] = [];
  const costs = new Map<number, number>(w.links.map(l => [l.id, l.cost]));
  let current = base;
  for (let round = 0; round < 3; round++) {
    let best: { o: Outlook; c: Command; note: string } | undefined;
    const consider = (c: Command, note: string): void => {
      const o = forecast(w, [...commands, c]);
      if (o && o.value < (best?.o.value ?? current.value)) best = { o, c, note };
    };
    for (const l of w.links) {
      if (!l.up) continue;
      const cost = costs.get(l.id)!;
      for (const d of COST_DELTAS) {
        const next = cost + d;
        if (!isValidCost(next) || next === l.cost) continue;
        consider({ type: "setCost", link: l.id, cost: next }, `${linkName(w, l)} cost ${l.cost}→${next}`);
      }
    }
    if (round === 0) {
      const present = presentSites(w);
      for (let i = 0; i < present.length; i++) for (let j = i + 1; j < present.length; j++) {
        const a = present[i]!.id, b = present[j]!.id, d = linkKm(w, a, b);
        if (linkBetween(w, a, b) || d > w.fiberKm - reserve) continue;
        consider({ type: "layLink", a, b }, `new link ${code(w, a)}–${code(w, b)} (${km(d)})`);
      }
    }
    // Only act on a clear improvement: the forecast is an estimate, and every change moves routes.
    if (!best || best.o.value > current.value * 0.8 - 0.3) break;
    commands.push(best.c); notes.push(best.note); current = best.o;
    if (best.c.type === "setCost") costs.set(best.c.link, best.c.cost);
  }
  if (commands.length === 0) return null;
  mem.lastRetuneStep = w.step;
  const worst = hotNow.sort((x, y) => linkUtil(w, y) - linkUtil(w, x))[0];
  const seen = worst ? `${linkName(w, worst)} is at ${pct(linkUtil(w, worst))}${queued(worst) > 0 ? " with a queue building" : ""}.` : "Forecast shows a queue building.";
  return { kind: "retune", commands,
    why: `${seen} Change: ${notes.join("; ")}. That moves ${routesMoved(w, commands)} routes; forecast drops over ${FORECAST_SEC} s go ${Math.round(base.drops)}→${Math.round(current.drops)}.` };
}
