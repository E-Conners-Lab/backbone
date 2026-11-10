// Canvas 2D drawing: the static backdrop, the label/icon overlay (used with both renderers), and
// the fallback renderer for the glowing shapes when WebGL2 is unavailable (AC20).

import coast from "../content/coast-na.json";
import { HEX } from "../content/palette";
import { MAP_H, MAP_W, project, toScreen, type Camera } from "./camera";
import { CAPSULE, DISC, STRIDE, type Label, type Scene } from "./scene";

export function sizeCanvas(canvas: HTMLCanvasElement, w: number, h: number, maxDpr: number): number {
  const dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
  return dpr;
}

const LAND = (coast.land as number[][][]).map(r => r.map(([lon, lat]) => project(lon!, lat!)));
const LAKES = (coast.lakes as number[][][]).map(r => r.map(([lon, lat]) => project(lon!, lat!)));

/** Backdrop: gradient, land, lakes, grid and coastline. Redrawn only when the camera changes. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, cam: Camera, dpr: number, parallax: boolean): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = ctx.createRadialGradient(cam.w / 2, cam.h * 0.42, 0, cam.w / 2, cam.h * 0.42, Math.max(cam.w, cam.h) * 0.75);
  g.addColorStop(0, HEX.navyLift); g.addColorStop(0.65, HEX.navy); g.addColorStop(1, "#02050d");
  ctx.fillStyle = g; ctx.fillRect(0, 0, cam.w, cam.h);

  // Grid sits on a slightly slower layer than the coast, for parallax when panning.
  const gridCam: Camera = parallax ? { ...cam, cx: MAP_W / 2 + (cam.cx - MAP_W / 2) * 0.82, cy: MAP_H / 2 + (cam.cy - MAP_H / 2) * 0.82 } : cam;
  ctx.lineWidth = 1;
  for (let i = -16; i <= 48; i++) {
    const major = i % 5 === 0;
    ctx.strokeStyle = HEX.grid; ctx.globalAlpha = major ? 0.26 : 0.12;
    const v = i * 50;
    let a = toScreen(gridCam, v, -800), b = toScreen(gridCam, v, MAP_H + 800);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (i >= -16 && i <= 34) {
      a = toScreen(gridCam, -800, v); b = toScreen(gridCam, MAP_W + 800, v);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;

  const trace = (ring: [number, number][]): void => {
    ctx.beginPath();
    ring.forEach(([x, y], i) => { const p = toScreen(cam, x, y); if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
  };
  ctx.lineJoin = "round";
  for (const ring of LAND) { trace(ring); ctx.fillStyle = HEX.land; ctx.globalAlpha = 0.8; ctx.fill(); }
  for (const ring of LAKES) { trace(ring); ctx.fillStyle = HEX.navy; ctx.globalAlpha = 0.9; ctx.fill(); }
  ctx.globalAlpha = 1;
  for (const [rings, alpha] of [[LAND, 0.7], [LAKES, 0.45]] as const) for (const ring of rings) {
    trace(ring);
    ctx.strokeStyle = HEX.blue; ctx.globalAlpha = alpha * 0.3; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = HEX.coast; ctx.globalAlpha = alpha; ctx.lineWidth = 1.1; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Fallback for the glowing shapes: the same list the WebGL renderer draws, with a cheap glow. */
export function drawShapes2d(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, dpr: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  const d = scene.shapes.data;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < scene.shapes.n; i++) {
    const o = i * STRIDE, size = d[o + 4]!, type = d[o + 10]!;
    const glow = pass === 0;
    if (glow && size < 0.9) continue;
    const a = d[o + 9]! * (glow ? 0.16 : 1);
    ctx.globalAlpha = Math.min(1, a);
    const style = `rgb(${Math.round(d[o + 6]! * 255)},${Math.round(d[o + 7]! * 255)},${Math.round(d[o + 8]! * 255)})`;
    if (type === CAPSULE) {
      ctx.strokeStyle = style; ctx.lineWidth = size * 2 * (glow ? 3.4 : 1);
      ctx.beginPath(); ctx.moveTo(d[o]!, d[o + 1]!); ctx.lineTo(d[o + 2]!, d[o + 3]!); ctx.stroke();
    } else if (type === DISC) {
      ctx.fillStyle = style;
      ctx.beginPath(); ctx.arc(d[o]!, d[o + 1]!, size * (glow ? 2.6 : 1), 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = style; ctx.lineWidth = d[o + 5]! * 2 * (glow ? 3.4 : 1);
      ctx.beginPath(); ctx.arc(d[o]!, d[o + 1]!, size, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

const MONO = '"IBM Plex Mono", Menlo, Consolas, monospace';

/** Labels and icons, always upright and crisp. Every color state gets its second cue here. */
export function drawOverlay(ctx: CanvasRenderingContext2D, scene: Scene, w: number, h: number, dpr: number): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
  const u = scene.unit;
  const order: Label["kind"][] = ["pill", "hot", "cut", "dark", "tag", "site", "hint"];
  for (const kind of order) for (const l of scene.labels) {
    if (l.kind !== kind) continue;
    switch (l.kind) {
      case "site":
        ctx.font = `700 ${u * 1.05}px ${MONO}`;
        ctx.lineWidth = u * 0.34; ctx.strokeStyle = HEX.navy; ctx.strokeText(l.text, l.x, l.y);
        ctx.fillStyle = l.color; ctx.fillText(l.text, l.x, l.y);
        break;
      case "pill": case "hint": {
        ctx.font = `600 ${u * 0.78}px ${MONO}`;
        const tw = ctx.measureText(l.text).width + u * 0.8, th = u * 1.25;
        ctx.fillStyle = "rgba(5,10,24,0.88)"; ctx.strokeStyle = l.color; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(l.x - tw / 2, l.y - th / 2, tw, th, u * 0.34); ctx.fill();
        ctx.globalAlpha = 0.75; ctx.stroke(); ctx.globalAlpha = 1;
        ctx.fillStyle = HEX.ice; ctx.fillText(l.text, l.x, l.y + 0.5);
        break;
      }
      case "tag": {
        ctx.font = `700 ${u * 0.72}px ${MONO}`;
        const tw = ctx.measureText(l.text).width + u * 0.7, th = u * 1.15;
        ctx.fillStyle = l.color; ctx.beginPath(); ctx.roundRect(l.x - tw / 2, l.y - th / 2, tw, th, u * 0.3); ctx.fill();
        ctx.fillStyle = HEX.navy; ctx.fillText(l.text, l.x, l.y + 0.5);
        break;
      }
      case "hot": {
        const r = u * 0.78;
        ctx.fillStyle = l.color; ctx.strokeStyle = HEX.navy; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(l.x, l.y - r); ctx.lineTo(l.x + r, l.y + r * 0.78); ctx.lineTo(l.x - r, l.y + r * 0.78); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = HEX.navy; ctx.lineWidth = u * 0.17; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(l.x, l.y - r * 0.38); ctx.lineTo(l.x, l.y + r * 0.2); ctx.moveTo(l.x, l.y + r * 0.5); ctx.lineTo(l.x, l.y + r * 0.52); ctx.stroke();
        break;
      }
      case "cut": {
        const r = u * 0.7;
        ctx.fillStyle = HEX.navy; ctx.strokeStyle = l.color; ctx.lineWidth = u * 0.15;
        ctx.beginPath(); ctx.arc(l.x, l.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.lineCap = "round"; ctx.lineWidth = u * 0.17;
        ctx.beginPath(); ctx.moveTo(l.x - r * 0.42, l.y - r * 0.42); ctx.lineTo(l.x + r * 0.42, l.y + r * 0.42);
        ctx.moveTo(l.x + r * 0.42, l.y - r * 0.42); ctx.lineTo(l.x - r * 0.42, l.y + r * 0.42); ctx.stroke();
        break;
      }
      case "dark": {
        const r = u * 0.85;
        ctx.strokeStyle = l.color; ctx.lineWidth = u * 0.18; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(l.x - r, l.y + r); ctx.lineTo(l.x + r, l.y - r); ctx.stroke();
        break;
      }
    }
  }
}
