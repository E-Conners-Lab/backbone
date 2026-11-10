// Independent oracle for the routing tests. It shares no code with src/sim/spf.ts and uses a
// different method: enumerate every simple path, keep the cheapest, collect their first hops.
// Only suitable for small graphs.

export interface OracleLink { a: number; b: number; cost: number }
export interface OracleRoute { cost: number; firstHops: number[] }

export function bruteForceRoute(nodes: number[], links: OracleLink[], from: number, to: number): OracleRoute | undefined {
  let best = Infinity;
  let firstHops = new Set<number>();
  const visited = new Set<number>([from]);
  const walk = (at: number, cost: number, first: number | undefined): void => {
    if (at === to) {
      if (first === undefined) return;
      if (cost < best) { best = cost; firstHops = new Set([first]); }
      else if (cost === best) firstHops.add(first);
      return;
    }
    for (const l of links) {
      const next = l.a === at ? l.b : l.b === at ? l.a : undefined;
      if (next === undefined || visited.has(next)) continue;
      visited.add(next);
      walk(next, cost + l.cost, first ?? next);
      visited.delete(next);
    }
  };
  if (!nodes.includes(from) || !nodes.includes(to)) return undefined;
  walk(from, 0, undefined);
  return best === Infinity ? undefined : { cost: best, firstHops: [...firstHops].sort((x, y) => x - y) };
}
