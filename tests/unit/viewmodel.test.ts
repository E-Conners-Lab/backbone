import { describe, expect, it } from "vitest";
import { projectCoast, validateRegion, validateTuning } from "../../src/content/load";
import coastJson from "../../src/content/coast-na.json";
import regionJson from "../../src/content/region-na.json";
import tuningJson from "../../src/content/tuning.json";
import { Camera, distanceToSegment } from "../../src/render/camera";
import { buildScene, type ViewState } from "../../src/render/viewmodel";
import { botCommands } from "../../src/sim/bot";
import { applyCommand, cloneWorld, createWorld, cutLink, step } from "../../src/sim/world";

const tuning = validateTuning(tuningJson);
const region = validateRegion(regionJson, tuning.maxSites);
const coast = projectCoast(coastJson, region.lon0, region.lat0);

function view(extra: Partial<ViewState> = {}): ViewState {
  const camera = new Camera();
  camera.resize(1920, 1080);
  camera.fit(-2600, -1600, 2100, 1400);
  return {
    camera,
    coast,
    alpha: 0.5,
    nowMs: 1000,
    unit: 16,
    paused: false,
    reducedMotion: false,
    projected: null,
    drag: null,
    focusSite: null,
    focusLink: null,
    linkStart: null,
    effects: [],
    ...extra,
  };
}

function playedWorld(seconds: number) {
  const world = createWorld("stage-1", region, tuning);
  while (world.step < seconds * tuning.stepsPerSec && !world.over) step(world, botCommands(world));
  return world;
}

describe("the scene shows what the simulation computed (FR-005, S8)", () => {
  const world = playedWorld(150);
  const scene = buildScene(world, view());

  it("has one pulse for every packet on a wire, and no other", () => {
    const onWires = world.links.reduce((n, l) => n + l.dirs[0].wire.length + l.dirs[1].wire.length, 0);
    expect(onWires).toBeGreaterThan(5);
    expect(scene.pulses.length).toBe(onWires);
  });

  it("draws every pulse on the segment of a link that holds a packet", () => {
    const busy = scene.links.filter((l) => {
      const link = world.links.find((w) => w.id === l.id)!;
      return link.dirs[0].wire.length + link.dirs[1].wire.length > 0;
    });
    for (const pulse of scene.pulses) {
      const nearest = Math.min(...busy.map((l) => distanceToSegment(pulse.x, pulse.y, l.ax, l.ay, l.bx, l.by)));
      expect(nearest).toBeLessThan(4);
    }
  });

  it("has one site per site on the map and one link per link, with the simulation's cost and state", () => {
    expect(scene.sites.map((s) => s.id)).toEqual(world.sites.filter((s) => s.appearStep <= world.step).map((s) => s.id));
    expect(scene.links.map((l) => l.id)).toEqual(world.links.map((l) => l.id));
    for (const item of scene.links) {
      const link = world.links.find((l) => l.id === item.id)!;
      expect(item.cost).toBe(link.cost);
      expect(item.tier).toBe(link.tier);
      expect(item.look === "cut").toBe(!link.up);
    }
  });

  it("makes a link thicker and brighter as its load rises", () => {
    const sorted = [...scene.links].filter((l) => l.look !== "cut").sort((p, q) => p.load - q.load);
    const low = sorted[0]!;
    const high = sorted.at(-1)!;
    expect(high.load).toBeGreaterThan(low.load);
    expect(high.width / high.s).toBeGreaterThan(low.width / low.s);
    expect(high.glow).toBeGreaterThan(low.glow);
  });

  it("shows a cut link as cut with no pulses on it", () => {
    const copy = cloneWorld(world);
    const target = copy.links.find((l) => l.dirs[0].wire.length + l.dirs[1].wire.length > 0)!;
    cutLink(copy, target.id, 100);
    const after = buildScene(copy, view());
    expect(after.links.find((l) => l.id === target.id)!.look).toBe("cut");
    expect(after.pulses.length).toBe(copy.links.reduce((n, l) => n + l.dirs[0].wire.length + l.dirs[1].wire.length, 0));
  });
});

describe("pending changes and reduced motion", () => {
  it("shows a queued link, a queued cost and a queued removal as pending, without touching the world", () => {
    const world = playedWorld(60);
    const before = JSON.stringify(world);
    const projected = cloneWorld(world);
    const first = world.links[0]!;
    const second = world.links[1]!;
    expect(applyCommand(projected, { type: "setCost", link: first.id, cost: 19 })).toBeNull();
    expect(applyCommand(projected, { type: "removeLink", link: second.id })).toBeNull();
    const sites = world.sites.filter((s) => s.appearStep <= world.step);
    const pair = sites.flatMap((a) => sites.map((b) => [a.id, b.id] as const)).find(([a, b]) => a < b && !world.links.some((l) => l.a === a && l.b === b))!;
    expect(applyCommand(projected, { type: "layLink", a: pair[0], b: pair[1] })).toBeNull();
    const scene = buildScene(world, view({ paused: true, projected }));
    expect(scene.links.find((l) => l.id === first.id)!.pendingCost).toBe(19);
    expect(scene.links.find((l) => l.id === first.id)!.cost).toBe(first.cost);
    expect(scene.links.find((l) => l.id === second.id)!.pending).toBe("remove");
    expect(scene.links.filter((l) => l.pending === "new").map((l) => [l.aId, l.bId])).toEqual([[pair[0], pair[1]]]);
    expect(JSON.stringify(world)).toBe(before);
  });

  it("reduced motion removes the sweep, the trails and the parallax, and keeps every item", () => {
    const world = playedWorld(150);
    const moving = buildScene(world, view());
    const still = buildScene(world, view({ reducedMotion: true }));
    expect(moving.sweep).not.toBeNull();
    expect(still.sweep).toBeNull();
    expect(still.pulses.length).toBe(moving.pulses.length);
    expect(still.links.length).toBe(moving.links.length);
    expect(still.sites.length).toBe(moving.sites.length);
    expect(still.pulses.every((p) => p.tx === p.x && p.ty === p.y)).toBe(true);
    expect(moving.pulses.some((p) => p.tx !== p.x || p.ty !== p.y)).toBe(true);
    // Without parallax the coastline sits exactly on the map plane.
    const cam = view().camera;
    const first = coast.rings[0]!;
    const onPlane = cam.toScreen(first[0]!, first[1]!);
    expect(still.land[0]![0]).toBeCloseTo(onPlane.x, 9);
    expect(moving.land[0]![0]).not.toBeCloseTo(onPlane.x, 3);
  });
});
