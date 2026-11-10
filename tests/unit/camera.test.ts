import { describe, expect, it } from "vitest";
import { Camera, HIT_RADIUS, distanceToSegment } from "../../src/render/camera";

function camera(width: number, height: number): Camera {
  const c = new Camera();
  c.resize(width, height);
  c.fit(-2400, -1500, 2000, 1300);
  return c;
}

describe("camera (FR-029: touch targets stay right on the tilted map)", () => {
  it("screen → map → screen is the identity, at phone and desktop sizes", () => {
    for (const [w, h] of [[844, 390], [1920, 1080], [390, 844]] as const) {
      const c = camera(w, h);
      for (const [x, y] of [[0, 0], [-2300, 1200], [1900, -1400], [722, 317], [-777, 82]] as const) {
        const screen = c.toScreen(x, y);
        const back = c.toMap(screen.x, screen.y);
        expect(back.x).toBeCloseTo(x, 6);
        expect(back.y).toBeCloseTo(y, 6);
      }
    }
  });

  it("fits the box inside the view with north up and the far edge drawn smaller", () => {
    const c = camera(1920, 1080);
    const north = c.toScreen(0, 1300);
    const south = c.toScreen(0, -1500);
    expect(north.y).toBeLessThan(south.y);
    expect(north.s).toBeLessThan(south.s);
    for (const [x, y] of [[-2400, -1500], [2000, 1300], [-2400, 1300], [2000, -1500]] as const) {
      const p = c.toScreen(x, y);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1920);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1080);
    }
  });

  it("zooming keeps the point under the pointer where it is, and panning moves the map with the drag", () => {
    const c = camera(1920, 1080);
    const under = c.toMap(400, 300);
    c.zoomAt(1.8, 400, 300);
    const after = c.toMap(400, 300);
    expect(after.x).toBeCloseTo(under.x, 6);
    expect(after.y).toBeCloseTo(under.y, 6);
    const centre = c.toScreen(c.cx, c.cy);
    const mapPoint = { x: c.cx, y: c.cy };
    c.panBy(50, 0);
    expect(c.toScreen(mapPoint.x, mapPoint.y).x).toBeCloseTo(centre.x + 50, 6);
  });

  it("a drag keeps the grabbed map point under the pointer, anywhere on the tilted map", () => {
    const c = camera(1920, 1080);
    for (const [fromX, fromY, toX, toY] of [[200, 900, 320, 840], [1500, 150, 1300, 400], [960, 540, 100, 100]] as const) {
      const grabbed = c.toMap(fromX, fromY);
      c.pin(grabbed, toX, toY);
      const under = c.toMap(toX, toY);
      expect(under.x).toBeCloseTo(grabbed.x, 6);
      expect(under.y).toBeCloseTo(grabbed.y, 6);
    }
  });

  it("stays inside its zoom limits", () => {
    const c = camera(844, 390);
    for (let i = 0; i < 50; i++) c.zoomAt(2, 100, 100);
    expect(c.zoom).toBe(c.maxZoom);
    for (let i = 0; i < 80; i++) c.zoomAt(0.5, 100, 100);
    expect(c.zoom).toBe(c.minZoom);
  });

  it("hit targets are 44 CSS pixels across", () => {
    expect(HIT_RADIUS * 2).toBeGreaterThanOrEqual(44);
    expect(distanceToSegment(5, 10, 0, 0, 10, 0)).toBeCloseTo(10, 9);
    expect(distanceToSegment(-3, 4, 0, 0, 10, 0)).toBeCloseTo(5, 9);
    expect(distanceToSegment(2, 2, 1, 1, 1, 1)).toBeCloseTo(Math.SQRT2, 9);
  });
});
