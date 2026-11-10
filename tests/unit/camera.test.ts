import { describe, expect, it } from "vitest";
import { REGION_NA } from "../../src/content/region-na";
import { fitCamera, panBy, project, toMap, toScreen, zoomAt } from "../../src/render/camera";

describe("camera", () => {
  const sizes: [number, number][] = [[1920, 1080], [844, 390], [390, 844]];
  it("screen -> map inverts map -> screen on the tilted map, after zoom and pan", () => {
    for (const [w, h] of sizes) {
      const c = fitCamera(w, h, REGION_NA, { top: 60, right: 10, bottom: 70, left: 10 });
      zoomAt(c, w * 0.3, h * 0.6, 1.7); panBy(c, 100, 100, 140, 80);
      for (const s of REGION_NA.sites) {
        const [mx, my] = project(s.lon, s.lat);
        const p = toScreen(c, mx, my);
        const [bx, by] = toMap(c, p.x, p.y);
        expect(bx).toBeCloseTo(mx, 6); expect(by).toBeCloseTo(my, 6);
      }
    }
  });
  it("fits every site inside the viewport minus the HUD insets", () => {
    for (const [w, h] of sizes) {
      const insets = { top: 60, right: 12, bottom: 70, left: 12 };
      const c = fitCamera(w, h, REGION_NA, insets);
      for (const s of REGION_NA.sites) {
        const p = toScreen(c, ...project(s.lon, s.lat));
        expect(p.x, `${s.code} ${w}x${h}`).toBeGreaterThan(insets.left); expect(p.x).toBeLessThan(w - insets.right);
        expect(p.y, `${s.code} ${w}x${h}`).toBeGreaterThan(insets.top - 4); expect(p.y).toBeLessThan(h - insets.bottom + 4);
      }
    }
  });
  it("the top of the map recedes: the same map distance is drawn smaller near the top", () => {
    const c = fitCamera(1920, 1080, REGION_NA, { top: 0, right: 0, bottom: 0, left: 0 });
    expect(toScreen(c, 800, 100).s).toBeLessThan(toScreen(c, 800, 800).s);
  });
});
