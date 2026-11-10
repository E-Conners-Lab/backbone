// Hop-by-hop next-hop choice (SPEC R2, F5, S4). Each router rotates through its own equal-cost
// next hops, in router-ID order, separately per destination. This is per-packet sharing: an
// explicit simplification of the per-flow hashing real routers use (RFC 2991 sections 2-3).

import type { RouterId, Routes } from "./spf";

/** Round-robin position per "router>destination". Plain object so a world stays cloneable. */
export type Rotors = Record<string, number>;

/** The neighbour to send to, or undefined when `at` has no route to `dst`. */
export function pickNextHop(routes: Routes, rotors: Rotors, at: RouterId, dst: RouterId): RouterId | undefined {
  const route = routes.get(at)?.get(dst);
  if (!route || route.nextHops.length === 0) return undefined;
  if (route.nextHops.length === 1) return route.nextHops[0];
  const key = `${at}>${dst}`;
  const i = (rotors[key] ?? 0) % route.nextHops.length;
  rotors[key] = i + 1;
  return route.nextHops[i];
}
