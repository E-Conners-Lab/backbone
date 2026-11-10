import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// AC18: no green and no red anywhere. Scans every hex color in the shipped sources.
describe("palette", () => {
  it("no shipped color is in a green or red hue band", () => {
    const root = join(import.meta.dirname, "../..");
    const files = ["src/content/palette.ts", "src/style.css", "index.html", "src/render/canvas.ts", "src/render/scene.ts", "src/ui/hud.ts"];
    const seen = new Set<string>(), bad: string[] = [];
    const colors: [string, string, number, number, number][] = [];
    for (const f of files) {
      const text = readFileSync(join(root, f), "utf8");
      for (const m of text.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
        const h = m[1]!.toLowerCase();
        colors.push([f, `#${h}`, parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255]);
      }
      // rgb()/rgba() literals with plain numbers, as used in the stylesheet and the canvas code.
      for (const m of text.matchAll(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/g))
        colors.push([f, m[0], Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255]);
    }
    for (const [f, hex, r, g, b] of colors) {
      seen.add(hex);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d === 0 || d / max < 0.25 || max < 0.2) continue;   // greys and near-blacks have no meaningful hue
      const hue = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
      if ((hue >= 75 && hue <= 165) || hue < 25 || hue > 340) bad.push(`${f} ${hex} hue ${Math.round(hue)}`);
    }
    expect(seen.size).toBeGreaterThan(10);
    expect(bad).toEqual([]);
  });
});
