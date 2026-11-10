// Builds src/content/coast-na.json from Natural Earth 1:50m land and lakes (public domain).
// Usage: node tools/build-coast.mjs <folder holding ne_50m_land.geojson and ne_50m_lakes.geojson>
// The output is committed, so players and the build never need the source data.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node tools/build-coast.mjs <natural-earth-folder>"); process.exit(1); }
const BOX = { w: -140, e: -50, s: 12, n: 62 };       // wider than the play area so clamped edges stay off screen
const TOLERANCE = 0.12;                              // degrees
const MIN_EXTENT = 0.6;                              // drop islands and lakes smaller than this, in degrees

const rings = file => {
  const out = [];
  for (const f of JSON.parse(readFileSync(join(dir, file), "utf8")).features) {
    const g = f.geometry;
    const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
    for (const poly of polys) out.push(poly[0]);     // outer ring only
  }
  return out;
};
const inBox = ([lon, lat]) => lon >= BOX.w && lon <= BOX.e && lat >= BOX.s && lat <= BOX.n;
const clamp = ([lon, lat]) => [Math.min(BOX.e, Math.max(BOX.w, lon)), Math.min(BOX.n, Math.max(BOX.s, lat))];

function simplify(pts, tol) {                        // Douglas-Peucker, iterative
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let worst = 0, at = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on the same point; measure from that point instead of a zero-length chord.
      const d = len > 0 ? Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len : Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function prepare(file) {
  const out = [];
  for (const ring of rings(file)) {
    if (!ring.some(inBox)) continue;
    const clamped = ring.map(clamp).filter((p, i, a) => i === 0 || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
    const lons = clamped.map(p => p[0]), lats = clamped.map(p => p[1]);
    if (Math.max(...lons) - Math.min(...lons) < MIN_EXTENT && Math.max(...lats) - Math.min(...lats) < MIN_EXTENT) continue;
    const s = simplify(clamped, TOLERANCE);
    if (s.length >= 4) out.push(s.map(([lon, lat]) => [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100]));
  }
  return out;
}
const data = { source: "Natural Earth 1:50m land and lakes, public domain, naturalearthdata.com", land: prepare("ne_50m_land.geojson"), lakes: prepare("ne_50m_lakes.geojson") };
writeFileSync("src/content/coast-na.json", JSON.stringify(data));
const count = a => a.reduce((n, r) => n + r.length, 0);
console.log(`land rings ${data.land.length} (${count(data.land)} points), lake rings ${data.lakes.length} (${count(data.lakes)} points)`);
