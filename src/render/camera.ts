// One camera owns tilt, zoom and pan, and converts both ways between map and screen coordinates,
// so drawing and hit-testing can never disagree on the tilted map.

import type { Region } from "../sim/world";

export const MAP_W = 1600;
export const MAP_H = 900;

const LAT0 = 36.7, LON0 = -96.7, PX_PER_DEG = 31.8, COS_LAT0 = Math.cos(38 * Math.PI / 180);

/** Longitude/latitude to map units (equirectangular, squeezed for mid-latitude). */
export function project(lon: number, lat: number): [number, number] {
  return [MAP_W / 2 + (lon - LON0) * COS_LAT0 * PX_PER_DEG, MAP_H / 2 - (lat - LAT0) * PX_PER_DEG];
}

export interface Camera {
  /** Viewport in CSS pixels. */
  w: number; h: number;
  /** Screen pixels per map unit at the focus point. */
  zoom: number;
  /** Map point shown at the focus point. */
  cx: number; cy: number;
  /** Focus point on screen. */
  ox: number; oy: number;
  /** Tilt about the horizontal axis, radians. The top of the map recedes. */
  tilt: number;
  /** Eye distance in pixels; smaller is a stronger perspective. */
  dist: number;
  minZoom: number; maxZoom: number;
}

export interface ScreenPoint { x: number; y: number; /** Perspective scale at this point; 1 at the focus. */ s: number }

export function toScreen(c: Camera, mx: number, my: number): ScreenPoint {
  const X = (mx - c.cx) * c.zoom, Y = (my - c.cy) * c.zoom;
  const s = c.dist / (c.dist - Y * Math.sin(c.tilt));
  return { x: c.ox + X * s, y: c.oy + Y * Math.cos(c.tilt) * s, s };
}

export function toMap(c: Camera, sx: number, sy: number): [number, number] {
  const u = sx - c.ox, v = sy - c.oy;
  const Y = v * c.dist / (c.dist * Math.cos(c.tilt) + v * Math.sin(c.tilt));
  const s = c.dist / (c.dist - Y * Math.sin(c.tilt));
  return [c.cx + u / s / c.zoom, c.cy + Y / c.zoom];
}

export interface Insets { top: number; right: number; bottom: number; left: number }

/** Frames every site of the region inside the viewport minus the HUD insets. */
export function fitCamera(w: number, h: number, region: Region, insets: Insets): Camera {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const s of region.sites) {
    const [x, y] = project(s.lon, s.lat);
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const pad = 70;
  const availW = Math.max(120, w - insets.left - insets.right), availH = Math.max(120, h - insets.top - insets.bottom);
  const tilt = 17 * Math.PI / 180;
  const zoom = Math.min(availW / (x1 - x0 + pad * 2), availH / ((y1 - y0 + pad * 2) * Math.cos(tilt)));
  return { w, h, zoom, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, ox: insets.left + availW / 2, oy: insets.top + availH / 2,
    tilt, dist: Math.max(w, h) * 1.25, minZoom: zoom * 0.6, maxZoom: zoom * 5 };
}

/** Zooms about a screen point, keeping the map point under it fixed. */
export function zoomAt(c: Camera, sx: number, sy: number, factor: number): void {
  const [mx, my] = toMap(c, sx, sy);
  c.zoom = Math.min(c.maxZoom, Math.max(c.minZoom, c.zoom * factor));
  const [nx, ny] = toMap(c, sx, sy);
  c.cx += mx - nx; c.cy += my - ny;
  clampPan(c);
}

/** Pans so the map point that was under (fromX, fromY) is now under (toX, toY). */
export function panBy(c: Camera, fromX: number, fromY: number, toX: number, toY: number): void {
  const [ax, ay] = toMap(c, fromX, fromY), [bx, by] = toMap(c, toX, toY);
  c.cx += ax - bx; c.cy += ay - by;
  clampPan(c);
}

function clampPan(c: Camera): void {
  c.cx = Math.min(MAP_W + 200, Math.max(-200, c.cx));
  c.cy = Math.min(MAP_H + 200, Math.max(-200, c.cy));
}
