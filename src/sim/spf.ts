// Shortest-path-first route calculation, after RFC 2328 section 16.1, reduced to one area of
// routers joined by point-to-point links (SPEC F1-F7, S1, S2).
//
// For each router as root, Dijkstra builds the shortest-path tree. A path's cost is the sum of
// its link costs. When a second path of EQUAL cost reaches a router, its next hops are ADDED to
// the set (16.1 step 2d, second bullet; 16.8). The next hop for a root's direct neighbour is that
// neighbour; for anything further it is inherited from the parent (16.1.1).

export type RouterId = number;

export interface SpfLink {
  a: RouterId;
  b: RouterId;
  /** Integer 1..65535 (RFC 2328 C.3: greater than 0; A.4.2: 16-bit metric). Same in both directions (S2). */
  cost: number;
  /** A down link is absent in both directions (F6). */
  up: boolean;
}

export interface Route {
  cost: number;
  /** Neighbour router IDs, ascending. Length 1 unless equal-cost sharing is on. */
  nextHops: RouterId[];
}

/** routes.get(from)?.get(to). A missing entry means unreachable. There is no entry for from === to. */
export type Routes = Map<RouterId, Map<RouterId, Route>>;

export const MIN_COST = 1;
export const MAX_COST = 65535;

export function isValidCost(cost: number): boolean {
  return Number.isInteger(cost) && cost >= MIN_COST && cost <= MAX_COST;
}

/**
 * @param maxPaths how many equal-cost next hops each router keeps. 1 keeps the lowest router ID
 *   (F4, S7). Infinity keeps all (F3).
 */
export function computeRoutes(routers: readonly RouterId[], links: readonly SpfLink[], maxPaths: number): Routes {
  const ids = [...routers].sort((x, y) => x - y);
  const adj = new Map<RouterId, { to: RouterId; cost: number }[]>();
  for (const id of ids) adj.set(id, []);
  for (const l of links) {
    if (!l.up) continue;
    if (!isValidCost(l.cost)) throw new Error(`invalid link cost ${l.cost} on ${l.a}-${l.b}`);
    adj.get(l.a)?.push({ to: l.b, cost: l.cost });
    adj.get(l.b)?.push({ to: l.a, cost: l.cost });
  }

  const routes: Routes = new Map();
  for (const root of ids) {
    const dist = new Map<RouterId, number>([[root, 0]]);
    const hops = new Map<RouterId, Set<RouterId>>();
    const done = new Set<RouterId>();

    for (;;) {
      // Closest candidate not yet on the tree. Ties broken by lowest router ID for determinism;
      // with positive costs the choice among ties does not change any result.
      let v: RouterId | undefined;
      let best = Infinity;
      for (const id of ids) {
        const d = dist.get(id);
        if (d !== undefined && !done.has(id) && d < best) { best = d; v = id; }
      }
      if (v === undefined) break;
      done.add(v);

      for (const { to: w, cost } of adj.get(v) ?? []) {
        if (done.has(w)) continue;
        const d = best + cost;
        const known = dist.get(w);
        const via: Iterable<RouterId> = v === root ? [w] : (hops.get(v) ?? []);
        if (known === undefined || d < known) {
          dist.set(w, d);
          hops.set(w, new Set(via));
        } else if (d === known) {
          const set = hops.get(w);
          if (set) for (const h of via) set.add(h);
        }
      }
    }

    const table = new Map<RouterId, Route>();
    for (const id of ids) {
      if (id === root) continue;
      const cost = dist.get(id);
      const set = hops.get(id);
      if (cost === undefined || !set) continue;
      const nextHops = [...set].sort((x, y) => x - y).slice(0, Math.max(1, maxPaths));
      table.set(id, { cost, nextHops });
    }
    routes.set(root, table);
  }
  return routes;
}
