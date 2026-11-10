// The shared view model. buildScene() turns the world into a flat list of glowing shapes
// (capsules, discs, rings) in screen pixels, plus labels and hit areas. BOTH renderers draw this
// same list, so the 2D fallback cannot drift from the WebGL view, and nothing is drawn that the
// simulation did not compute (constitution C1).

import { HEX, loadColor, RGB, type Rgb } from "../content/palette";
import type { Game } from "../ui/game";
import { capacityOf, dirUtil, isActive, isDark, isPresent, linkKm, type Link } from "../sim/world";
import { MAP_H, MAP_W, toScreen, type Camera, type ScreenPoint } from "./camera";


export const STRIDE = 12;            // x0 y0 x1 y1 size aux r g b a type pad
export const CAPSULE = 0, DISC = 1, RING = 2;

export class Shapes {
  data = new Float32Array(STRIDE * 4096);
  n = 0;
  private put(x0: number, y0: number, x1: number, y1: number, size: number, aux: number, c: Rgb, a: number, type: number): void {
    if (a <= 0.003) return;
    if ((this.n + 1) * STRIDE > this.data.length) { const bigger = new Float32Array(this.data.length * 2); bigger.set(this.data); this.data = bigger; }
    const d = this.data, i = this.n++ * STRIDE;
    d[i] = x0; d[i + 1] = y0; d[i + 2] = x1; d[i + 3] = y1; d[i + 4] = size; d[i + 5] = aux;
    d[i + 6] = c[0]; d[i + 7] = c[1]; d[i + 8] = c[2]; d[i + 9] = a; d[i + 10] = type; d[i + 11] = 0;
  }
  seg(x0: number, y0: number, x1: number, y1: number, width: number, c: Rgb, a: number): void { this.put(x0, y0, x1, y1, width / 2, 0, c, a, CAPSULE); }
  disc(x: number, y: number, r: number, c: Rgb, a: number): void { this.put(x, y, x, y, r, 0, c, a, DISC); }
  ring(x: number, y: number, r: number, thickness: number, c: Rgb, a: number): void { this.put(x, y, x, y, r, thickness / 2, c, a, RING); }
  dashed(x0: number, y0: number, x1: number, y1: number, width: number, c: Rgb, a: number, dash: number, gap: number, phase = 0): void {
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1) return;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    for (let t = -((phase % (dash + gap)) + dash + gap) % (dash + gap); t < len; t += dash + gap) {
      const s = Math.max(0, t), e = Math.min(len, t + dash);
      if (e > s) this.seg(x0 + ux * s, y0 + uy * s, x0 + ux * e, y0 + uy * e, width, c, a);
    }
  }
}

export type LabelKind = "site" | "pill" | "tag" | "hot" | "cut" | "dark" | "hint";
export interface Label { kind: LabelKind; x: number; y: number; text: string; color: string; scale: number }
export interface SiteHit { id: number; x: number; y: number; r: number }
export interface LinkHit { id: number; x0: number; y0: number; x1: number; y1: number }
export interface Drag { from: number; x: number; y: number; over: number | null }

export interface Scene {
  shapes: Shapes;
  labels: Label[];
  sites: SiteHit[];
  links: LinkHit[];
  /** Base type size in CSS pixels; scales up on a projector. */
  unit: number;
}

export interface SceneOptions { reduced: boolean; drag: Drag | null; focusSite: number | null; showUtil: boolean }

const shapes = new Shapes();

export function buildScene(game: Game, cam: Camera, opts: SceneOptions): Scene {
  const w = game.view, t = game.clock, tune = w.tuning;
  const unit = Math.min(20, Math.max(11, cam.h * 0.0185));
  const ws = Math.min(1.3, Math.max(0.85, unit / 14)) * Math.sqrt(cam.zoom / (cam.minZoom / 0.6));
  shapes.n = 0;
  const labels: Label[] = [], siteHits: SiteHit[] = [], linkHits: LinkHit[] = [];
  const at = (id: number): ScreenPoint | undefined => { const p = game.sitePos.get(id); return p ? toScreen(cam, p[0], p[1]) : undefined; };
  const live = game.lapse === null && game.mode !== "welcome";

  // Scanning sweep: decoration only, removed with reduced motion.
  if (!opts.reduced) {
    const x = ((performance.now() / 1000 * 110) % (MAP_W + 900)) - 450;
    const a = toScreen(cam, x, -150), b = toScreen(cam, x - 190, MAP_H + 150);
    shapes.seg(a.x - 40, a.y, b.x - 40, b.y, 90, RGB.cyan, 0.022);
    shapes.seg(a.x, a.y, b.x, b.y, 2, RGB.ice, 0.1);
  }

  // What the pending (paused) changes will do, so they can be drawn as pending (AC14).
  const preview = live ? game.preview : null;
  const previewLink = (id: number): Link | undefined => preview?.links.find(l => l.id === id);

  // The welcome screen shows the bare map: no links, packets or sites from an idle or finished world.
  const links = game.mode === "welcome" ? [] : w.links;
  for (const l of links) {
    const pa = at(l.a), pb = at(l.b);
    if (!pa || !pb) continue;
    linkHits.push({ id: l.id, x0: pa.x, y0: pa.y, x1: pb.x, y1: pb.y });
    const sc = (pa.s + pb.s) / 2 * ws;
    const dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
    const u0 = dirUtil(w, l, 0), u1 = dirUtil(w, l, 1), u = Math.max(u0, u1);
    const hot = l.up && u >= tune.congestionAt;
    const dropping = l.up && t - (game.lastDrop.get(l.id) ?? -99) < 1.5 && live;
    const selected = live && game.selectedLink === l.id;
    const after = preview ? previewLink(l.id) : l;
    const removing = preview !== null && !after;
    const width = (1.6 + l.tier * 1.5 + u * 6.5) * sc;
    // Keep labels on the side of the link that faces up the screen, so they read consistently.
    const side = ny < 0 ? 1 : -1;
    const lx = mx + nx * side * (width / 2 + unit * 0.95), ly = my + ny * side * (width / 2 + unit * 0.95);

    if (selected) shapes.seg(pa.x, pa.y, pb.x, pb.y, width + 10 * sc, RGB.ice, 0.16);

    if (!l.up) {
      // Fiber cut: magenta AND a broken, dashed line AND a cut icon AND a repair countdown.
      const g = Math.min(0.08, 16 / len);
      shapes.dashed(pa.x, pa.y, pa.x + dx * (0.5 - g), pa.y + dy * (0.5 - g), 2.6 * sc, RGB.magenta, 0.9, 13 * sc, 7 * sc);
      shapes.dashed(pb.x, pb.y, pb.x - dx * (0.5 - g), pb.y - dy * (0.5 - g), 2.6 * sc, RGB.magenta, 0.9, 13 * sc, 7 * sc);
      labels.push({ kind: "cut", x: mx, y: my, text: "", color: HEX.magenta, scale: sc });
      const left = Math.max(0, Math.ceil((l.restoreStep - w.step) / tune.stepsPerSec));
      labels.push({ kind: "pill", x: lx, y: ly, text: `CUT ${left}s`, color: HEX.magenta, scale: 1 });
      continue;
    }

    if (removing) {
      shapes.dashed(pa.x, pa.y, pb.x, pb.y, 2 * sc, RGB.muted, 0.6, 5 * sc, 9 * sc);
      labels.push({ kind: "pill", x: lx, y: ly, text: "REMOVING", color: HEX.muted, scale: 1 });
      continue;
    }

    const color = hot ? RGB.amber : loadColor(u);
    shapes.seg(pa.x, pa.y, pb.x, pb.y, width, color, 0.45 + u * 0.5);
    // Capacity tier: thin rails beside the link, one pair per tier above the first.
    for (let k = 1; k <= l.tier; k++) for (const s of [-1, 1]) {
      const o = s * (width / 2 + 2.2 * k * sc + 1);
      shapes.seg(pa.x + nx * o, pa.y + ny * o, pb.x + nx * o, pb.y + ny * o, 1, RGB.ice, 0.42);
    }
    if (hot) {
      // Congestion: amber AND thickest AND a marching dash pattern AND a warning icon.
      const march = opts.reduced ? 0 : t * 26;
      shapes.dashed(pa.x, pa.y, pb.x, pb.y, Math.max(1.4, width * 0.26), RGB.amberPale, 0.8, 5 * sc, (dropping ? 6 : 11) * sc, -march);
      labels.push({ kind: "hot", x: mx - nx * side * (width / 2 + unit * 1.1), y: my - ny * side * (width / 2 + unit * 1.1), text: dropping ? "!" : "", color: HEX.amber, scale: sc });
    }

    // Packets. One pulse is one simulated packet, at the position the simulation gives it.
    for (const d of [0, 1] as const) {
      const from = d === 0 ? pa : pb, sign = d === 0 ? 1 : -1;
      const ox = nx * sign * (width / 2 + 2.6 * sc), oy = ny * sign * (width / 2 + 2.6 * sc);
      const dir = l.dirs[d];
      for (const p of dir.flight) {
        const f = Math.min(1, Math.max(0, (p.total - p.remain + (live ? game.alpha : 0)) / p.total));
        const hx = from.x + dx * sign * f + ox, hy = from.y + dy * sign * f + oy;
        if (!opts.reduced) {
          const tail = Math.min(26 * sc, f * len);
          shapes.seg(hx, hy, hx - ux * sign * tail, hy - uy * sign * tail, 1.6 * sc, hot ? RGB.amberPale : RGB.cyan, 0.3);
          shapes.seg(hx, hy, hx - ux * sign * tail * 0.45, hy - uy * sign * tail * 0.45, 2.4 * sc, hot ? RGB.amberPale : RGB.cyan, 0.5);
        }
        shapes.disc(hx, hy, 2.7 * sc, RGB.white, 1);
      }
      // Packets waiting in the queue stack up at the sending end: congestion you can count.
      const backedUp = dir.queue.length * 2 >= tune.queueLen;
      for (let i = 0; i < dir.queue.length; i++) {
        const f = Math.min(0.3, (15 + i * 5.2) * sc / len);
        shapes.disc(from.x + dx * sign * f + ox, from.y + dy * sign * f + oy, 2.1 * sc, backedUp ? RGB.amberPale : RGB.ice, backedUp ? 0.95 : 0.6);
      }
    }

    const pct = `${Math.round(u * 100)}%`;
    const costText = after && after.cost !== l.cost ? `${l.cost}→${after.cost}` : String(l.cost);
    const tierText = after && after.tier !== l.tier ? ` ▲${capacityOf(preview ?? w, after)}/s` : "";
    labels.push({ kind: "pill", x: lx, y: ly, text: opts.showUtil || hot || selected ? `${costText} · ${pct}${tierText}` : costText + tierText,
      color: hot ? HEX.amber : HEX.cyan, scale: 1 });
  }

  // Links that exist only in the pending queue.
  if (preview) for (const l of preview.links) {
    if (w.links.some(x => x.id === l.id)) continue;
    const pa = at(l.a), pb = at(l.b);
    if (!pa || !pb) continue;
    shapes.dashed(pa.x, pa.y, pb.x, pb.y, 2.2 * ws, RGB.cyan, 0.85, 9 * ws, 7 * ws);
    labels.push({ kind: "pill", x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2, text: `PENDING · ${l.km} km`, color: HEX.cyan, scale: 1 });
  }

  // The link being dragged out.
  if (opts.drag && live) {
    const from = at(opts.drag.from), over = opts.drag.over !== null ? at(opts.drag.over) : undefined;
    if (from) {
      const ex = over?.x ?? opts.drag.x, ey = over?.y ?? opts.drag.y;
      const budget = (preview ?? w).fiberKm;
      const km = opts.drag.over !== null ? linkKm(w, opts.drag.from, opts.drag.over) : null;
      const ok = km !== null && km <= budget;
      shapes.dashed(from.x, from.y, ex, ey, 2.4 * ws, km !== null && !ok ? RGB.amber : RGB.ice, 0.9, 8 * ws, 6 * ws);
      if (km !== null) labels.push({ kind: "hint", x: (from.x + ex) / 2, y: (from.y + ey) / 2 - unit * 1.4,
        text: ok ? `${km} km` : `${km} km · only ${budget} km of fiber`, color: ok ? HEX.ice : HEX.amber, scale: 1 });
    }
  }

  for (const s of w.sites) {
    if (!isPresent(w, s) || game.mode === "welcome") continue;
    const p = at(s.id);
    if (!p) continue;
    const sc = p.s * ws, r = 11 * sc;
    siteHits.push({ id: s.id, x: p.x, y: p.y, r: Math.max(22, r * 2) });
    const fresh = !isActive(w, s), dark = isDark(w, s);
    const hasLink = w.links.some(l => l.a === s.id || l.b === s.id);
    if (dark) {
      // Dark site: dim hollow ring AND a slashed icon.
      shapes.ring(p.x, p.y, r, 2.4 * sc, RGB.muted, 0.7);
      labels.push({ kind: "dark", x: p.x, y: p.y, text: "", color: HEX.magenta, scale: sc });
    } else if (fresh) {
      // New site: thin ring, slow ping, NEW tag with the seconds left before it starts sending.
      shapes.ring(p.x, p.y, r, 1.6 * sc, RGB.ice, 0.9);
      if (!opts.reduced) { const ph = (performance.now() / 1000 / 2.2) % 1; shapes.ring(p.x, p.y, r + ph * 34 * sc, 1.4 * sc, RGB.cyan, (1 - ph) * 0.5); }
      labels.push({ kind: "tag", x: p.x, y: p.y + r + unit * 1.1, text: `NEW ${Math.max(0, Math.ceil((s.activeStep - w.step) / tune.stepsPerSec))}s`, color: HEX.cyan, scale: 1 });
    } else {
      shapes.ring(p.x, p.y, r, 3 * sc, hasLink ? RGB.cyan : RGB.amber, 1);
      shapes.disc(p.x, p.y, 4.6 * sc, RGB.ice, 1);
    }
    if (opts.focusSite === s.id || opts.drag?.from === s.id || opts.drag?.over === s.id) shapes.ring(p.x, p.y, r + 7 * sc, 2 * sc, RGB.ice, 0.85);
    labels.push({ kind: "site", x: p.x, y: p.y - r - unit * 0.55, text: s.code, color: HEX.ice, scale: 1 });
  }

  // Effects raised by simulation events.
  for (const f of game.fx) {
    const age = t - f.t0;
    if (age < 0) continue;
    const p = toScreen(cam, f.x, f.y), sc = p.s * ws;
    if (f.kind === "cut") {
      // The snap: a magenta spark, then the reconvergence ripple spreading from the break.
      if (age < 0.9 && !opts.reduced) for (let i = 0; i < 10; i++) {
        const an = i * 0.63 + 0.3, r0 = (4 + age * 30) * sc, r1 = r0 + (8 + (i * 7 % 11)) * sc * (1 - age / 0.9);
        shapes.seg(p.x + Math.cos(an) * r0, p.y + Math.sin(an) * r0, p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1, 2 * sc, i % 2 ? RGB.magentaPale : RGB.magenta, 1 - age / 0.9);
      }
      if (age < 0.25) shapes.disc(p.x, p.y, (10 + age * 60) * sc, RGB.magentaPale, 0.9 * (1 - age / 0.25));
      if (!opts.reduced) for (let k = 0; k < 3; k++) {
        const ph = (age - k * 0.35) / 2.4;
        if (ph > 0 && ph < 1) shapes.ring(p.x, p.y, (12 + ph * 420) * cam.zoom * p.s, (3 - ph * 2) * sc, ph < 0.25 ? RGB.magenta : RGB.cyan, (1 - ph) * 0.55);
      }
    } else if (f.kind === "ripple") {
      const ph = age / 1.2;
      if (ph < 1 && !opts.reduced) shapes.ring(p.x, p.y, (10 + ph * 150) * cam.zoom * p.s, 2 * sc, RGB.cyan, (1 - ph) * 0.5);
    } else if (f.kind === "ping") {
      if (!opts.reduced) for (let k = 0; k < 3; k++) {
        const ph = (age - k * 0.4) / 1.8;
        if (ph > 0 && ph < 1) shapes.ring(p.x, p.y, (10 + ph * 70) * sc, 1.6 * sc, RGB.cyan, (1 - ph) * 0.7);
      }
    } else if (age < 0.4) {
      shapes.disc(p.x, p.y, (9 + age * 26) * sc, RGB.amber, 0.55 * (1 - age / 0.4));
    }
  }

  return { shapes, labels, sites: siteHits, links: linkHits, unit };
}
