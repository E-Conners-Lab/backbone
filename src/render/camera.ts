// One camera owns tilt, zoom and pan, and converts both ways between the map (kilometres,
// north up) and the screen (CSS pixels), so that hit-testing stays right on the tilted map.

export interface ScreenPoint {
  x: number;
  y: number;
  /** Local scale: how much nearer or farther this point is drawn than the map's centre. */
  s: number;
}

/** Sites and links can be picked within this many CSS pixels: a 44-pixel target. */
export const HIT_RADIUS = 22;

export class Camera {
  width = 1;
  height = 1;
  /** Map point at the centre of the view, in km. */
  cx = 0;
  cy = 0;
  /** CSS pixels per km at the centre. */
  zoom = 0.2;
  /** Tilt of the map plane, in radians. The top of the map leans away from the viewer. */
  tilt = (22 * Math.PI) / 180;
  minZoom = 0.02;
  maxZoom = 4;

  private get distance(): number {
    return this.height * 2.4;
  }

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  /** Centres and zooms so that the box of map points fits, leaving room for the HUD. */
  fit(minX: number, minY: number, maxX: number, maxY: number, margin = 0.78): void {
    this.cx = (minX + maxX) / 2;
    this.cy = (minY + maxY) / 2;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    this.zoom = Math.min((this.width * margin) / spanX, (this.height * margin) / (spanY * Math.cos(this.tilt)));
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom));
  }

  /** Map km to screen pixels. `depth` shifts a layer for parallax: 1 moves with the map. */
  toScreen(x: number, y: number, depth = 1): ScreenPoint {
    const u = (x - this.cx * depth) * this.zoom;
    const v = -(y - this.cy * depth) * this.zoom;
    const scale = this.distance / (this.distance - v * Math.sin(this.tilt));
    return {
      x: this.width / 2 + u * scale,
      y: this.height / 2 + v * Math.cos(this.tilt) * scale,
      s: scale,
    };
  }

  /** Screen pixels back to map km. The exact inverse of toScreen at depth 1. */
  toMap(sx: number, sy: number): { x: number; y: number } {
    const p = sx - this.width / 2;
    const q = sy - this.height / 2;
    const d = this.distance;
    const v = (q * d) / (d * Math.cos(this.tilt) + q * Math.sin(this.tilt));
    const scale = d / (d - v * Math.sin(this.tilt));
    return { x: this.cx + p / scale / this.zoom, y: this.cy - v / this.zoom };
  }

  /** Moves the view by a drag of (dx, dy) screen pixels. */
  panBy(dx: number, dy: number): void {
    this.cx -= dx / this.zoom;
    this.cy += dy / (this.zoom * Math.cos(this.tilt));
  }

  /** Zooms by `factor`, keeping the map point under (sx, sy) where it is. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const before = this.toMap(sx, sy);
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    const after = this.toMap(sx, sy);
    this.cx += before.x - after.x;
    this.cy += before.y - after.y;
  }
}

/** Distance in pixels from point p to the segment a–b. */
export function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const length2 = dx * dx + dy * dy;
  const t = length2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
