import { describe, expect, it } from "vitest";
import fixtures from "../fixtures/ospf-cases.json";
import { pickNextHop, type Rotors } from "../../src/sim/forwarding";
import { nextFloat, nextInt, type RngState } from "../../src/sim/rng";
import { computeRoutes, isValidCost, type SpfLink } from "../../src/sim/spf";
import { bruteForceRoute } from "./oracle";

type Topo = { routers: Record<string, number>; links: (string | number)[][] };
type Expect = { from: string; to: string; cost?: number; nextHops?: string[]; unreachable?: boolean };
type Case = { id: number; name: string; topology: string; sharing: boolean; setCost?: (string | number)[][]; cut?: string[][];
  expect: Expect[]; shares?: { from: string; to: string; packets: number; links: Record<string, number> } };

function build(c: Case): { ids: Record<string, number>; links: SpfLink[] } {
  const topo = (fixtures.topologies as Record<string, Topo>)[c.topology]!;
  const ids = topo.routers;
  const links: SpfLink[] = topo.links.map(([a, b, cost]) => ({ a: ids[a as string]!, b: ids[b as string]!, cost: cost as number, up: true }));
  const find = (a: string, b: string): SpfLink => {
    const l = links.find(x => (x.a === ids[a] && x.b === ids[b]) || (x.a === ids[b] && x.b === ids[a]));
    if (!l) throw new Error(`fixture names a missing link ${a}-${b}`);
    return l;
  };
  for (const [a, b, cost] of c.setCost ?? []) find(a as string, b as string).cost = cost as number;
  for (const [a, b] of c.cut ?? []) find(a!, b!).up = false;
  return { ids, links };
}

describe("spec cases 1-8: routes match the hand-worked values", () => {
  for (const c of fixtures.cases as Case[]) {
    it(`case ${c.id}: ${c.name}`, () => {
      const { ids, links } = build(c);
      const routes = computeRoutes(Object.values(ids), links, c.sharing ? Infinity : 1);
      for (const e of c.expect) {
        const got = routes.get(ids[e.from]!)?.get(ids[e.to]!);
        if (e.unreachable) { expect(got, `${e.from}->${e.to}`).toBeUndefined(); continue; }
        expect(got, `${e.from}->${e.to}`).toEqual({ cost: e.cost, nextHops: e.nextHops!.map(n => ids[n]!).sort((x, y) => x - y) });
      }
    });
  }

  it("case 7: packets forwarded hop by hop split per hop, not per path", () => {
    const c = (fixtures.cases as Case[]).find(x => x.id === 7)!;
    const { ids, links } = build(c);
    const routes = computeRoutes(Object.values(ids), links, Infinity);
    const name = Object.fromEntries(Object.entries(ids).map(([k, v]) => [v, k]));
    const counts: Record<string, number> = {};
    const rotors: Rotors = {};
    const s = c.shares!;
    for (let p = 0; p < s.packets; p++) {
      let at = ids[s.from]!;
      for (let hop = 0; at !== ids[s.to]; hop++) {
        expect(hop).toBeLessThan(10);
        const next = pickNextHop(routes, rotors, at, ids[s.to]!)!;
        const key = `${name[at]}-${name[next]}`;
        counts[key] = (counts[key] ?? 0) + 1;
        at = next;
      }
    }
    expect(counts).toEqual(s.links);
  });
});

describe("spec case 10: cost range", () => {
  it("rejects 0, 65536, negatives and non-integers; accepts 1 and 65535", () => {
    for (const v of fixtures.invalidCosts.values) expect(isValidCost(v), String(v)).toBe(false);
    for (const v of fixtures.invalidCosts.valid) expect(isValidCost(v), String(v)).toBe(true);
  });
  it("refuses to compute with an invalid cost rather than guessing", () => {
    expect(() => computeRoutes([1, 2], [{ a: 1, b: 2, cost: 0, up: true }], 1)).toThrow();
  });
});

describe("engine agrees with the brute-force oracle on seeded random graphs", () => {
  it("every router pair, 300 graphs of 3-7 routers, small costs so ties are common", () => {
    const rng: RngState = { s: 20261109 };
    let pairs = 0, ties = 0, unreachable = 0;
    for (let g = 0; g < 300; g++) {
      const n = nextInt(rng, 3, 7);
      const nodes = Array.from({ length: n }, (_, i) => i + 1);
      const links: SpfLink[] = [];
      for (let a = 1; a <= n; a++) for (let b = a + 1; b <= n; b++)
        if (nextFloat(rng) < 0.5) links.push({ a, b, cost: nextInt(rng, 1, 4), up: nextFloat(rng) < 0.9 });
      const routes = computeRoutes(nodes, links, Infinity);
      const one = computeRoutes(nodes, links, 1);
      const upLinks = links.filter(l => l.up);
      for (const from of nodes) for (const to of nodes) {
        if (from === to) continue;
        pairs++;
        const want = bruteForceRoute(nodes, upLinks, from, to);
        const got = routes.get(from)?.get(to);
        if (!want) { unreachable++; expect(got).toBeUndefined(); expect(one.get(from)?.get(to)).toBeUndefined(); continue; }
        expect(got, `graph ${g} ${from}->${to}`).toEqual({ cost: want.cost, nextHops: want.firstHops });
        expect(one.get(from)?.get(to)).toEqual({ cost: want.cost, nextHops: [want.firstHops[0]] });
        if (want.firstHops.length > 1) ties++;
      }
    }
    // The comparison is only meaningful if the random graphs really exercised ties and dead ends.
    expect(pairs).toBeGreaterThan(5000);
    expect(ties).toBeGreaterThan(200);
    expect(unreachable).toBeGreaterThan(50);
  });

  it("hop-by-hop forwarding with one route kept never loops and arrives at the oracle's cost", () => {
    const rng: RngState = { s: 7 };
    for (let g = 0; g < 100; g++) {
      const n = nextInt(rng, 3, 7);
      const nodes = Array.from({ length: n }, (_, i) => i + 1);
      const links: SpfLink[] = [];
      for (let a = 1; a <= n; a++) for (let b = a + 1; b <= n; b++)
        if (nextFloat(rng) < 0.55) links.push({ a, b, cost: nextInt(rng, 1, 3), up: true });
      const routes = computeRoutes(nodes, links, 1);
      for (const from of nodes) for (const to of nodes) {
        if (from === to) continue;
        const want = bruteForceRoute(nodes, links, from, to);
        if (!want) continue;
        let at = from, cost = 0;
        for (let hop = 0; at !== to; hop++) {
          expect(hop, "loop").toBeLessThan(n);
          const next = pickNextHop(routes, {}, at, to)!;
          cost += links.find(l => (l.a === at && l.b === next) || (l.b === at && l.a === next))!.cost;
          at = next;
        }
        expect(cost).toBe(want.cost);
      }
    }
  });
});
