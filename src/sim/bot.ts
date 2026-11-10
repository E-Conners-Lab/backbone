// A simple scripted player. Used by tests, the seeded-run video, tuning, and (later) attract mode.
// It only looks at the world and returns commands; it has no special access.

import { isPresent, linkBetween, linkKm, linkUtil, type Command, type Site, type World } from "./world";

export function botCommands(w: World): Command[] {
  if (w.over) return [];
  if (w.pendingReward) {
    const unlinked = w.sites.some(s => isPresent(w, s) && degree(w, s.id) === 0);
    const hot = w.links.some(l => l.up && linkUtil(w, l) > 0.7 && l.tier < w.tuning.tiers.length - 1);
    return [{ type: "chooseReward", choice: !unlinked && hot && w.fiberKm > 1500 ? "upgrade" : "fiber" }];
  }
  if (w.step % w.tuning.stepsPerSec !== 0) return [];   // one decision per second

  const present = w.sites.filter(s => isPresent(w, s));
  // 1. Connect any site that has no link, to its nearest neighbour that has one (or any, at the start).
  for (const s of present) {
    if (degree(w, s.id) > 0) continue;
    const linked = present.filter(o => o.id !== s.id && degree(w, o.id) > 0);
    const target = nearest(w, s, linked.length > 0 ? linked : present.filter(o => o.id !== s.id), []);
    if (target && linkKm(w, s.id, target.id) <= w.fiberKm) return [{ type: "layLink", a: s.id, b: target.id }];
  }
  // 2. Spend an upgrade on the busiest link.
  if (w.upgrades > 0) {
    const hot = [...w.links].filter(l => l.up && l.tier < w.tuning.tiers.length - 1).sort((x, y) => linkUtil(w, y) - linkUtil(w, x) || x.id - y.id)[0];
    if (hot && linkUtil(w, hot) >= 0.75) return [{ type: "upgrade", link: hot.id }];
  }
  // 3. Give single-homed sites a second link (redundancy).
  for (const s of present) {
    if (degree(w, s.id) !== 1) continue;
    const neighbours = w.links.filter(l => l.a === s.id || l.b === s.id).map(l => (l.a === s.id ? l.b : l.a));
    const target = nearest(w, s, present.filter(o => o.id !== s.id), neighbours);
    // Keep a reserve so the next new site can still be connected.
    if (target && linkKm(w, s.id, target.id) <= w.fiberKm - 1500) return [{ type: "layLink", a: s.id, b: target.id }];
  }
  return [];
}

const degree = (w: World, id: number): number => w.links.filter(l => l.a === id || l.b === id).length;

function nearest(w: World, from: Site, among: Site[], exclude: number[]): Site | undefined {
  let best: Site | undefined, bestKm = Infinity;
  for (const o of among) {
    if (exclude.includes(o.id) || linkBetween(w, from.id, o.id)) continue;
    const km = linkKm(w, from.id, o.id);
    if (km < bestKm) { bestKm = km; best = o; }
  }
  return best;
}
