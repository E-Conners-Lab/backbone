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
  tilt = (32 * Math.PI) / 180;
  minZoom = 0.02;
  maxZoom = 4;

  private get distance(): number {
    return this.height * 2.4;
  }

  /**
   * The tilted map plane meets the eye at a finite distance south of the view's centre, and
   * its horizon at a finite distance north. Past either, the perspective division gives an
   * infinite or negative scale. Points are held this share of the way there instead, which
   * is always far off the bottom or the top of the view, so nothing drawn changes.
   */
  private static readonly LIMIT = 0.75;

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
  }

  /**
   * Centres and zooms so that the box of map points fits in the part of the view that the
   * bars at the top and bottom leave free.
   */
  fit(minX: number, minY: number, maxX: number, maxY: number, top = 0, bottom = 0, margin = 0.84): void {
    this.cx = (minX + maxX) / 2;
    this.cy = (minY + maxY) / 2;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const free = Math.max(1, this.height - top - bottom);
    this.zoom = Math.min((this.width * margin) / spanX, (free * margin) / (spanY * Math.cos(this.tilt)));
    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom));
    // Put the middle of the box in the middle of the free part, not of the whole view.
    this.pin({ x: this.cx, y: this.cy }, this.width / 2, top + free / 2);
  }

  /** Map km to screen pixels. `depth` shifts a layer for parallax: 1 moves with the map. */
  toScreen(x: number, y: number, depth = 1): ScreenPoint {
    const u = (x - this.cx * depth) * this.zoom;
    const nearest = (Camera.LIMIT * this.distance) / Math.sin(this.tilt);
    const v = Math.min(-(y - this.cy * depth) * this.zoom, nearest);
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
    const d = this.distance;
    // A pointer dragged far above the view would reach the horizon, where the division fails.
    const horizon = (-d * Math.cos(this.tilt)) / Math.sin(this.tilt);
    const q = Math.max(sy - this.height / 2, Camera.LIMIT * horizon);
    const v = (q * d) / (d * Math.cos(this.tilt) + q * Math.sin(this.tilt));
    const scale = d / (d - v * Math.sin(this.tilt));
    return { x: this.cx + p / scale / this.zoom, y: this.cy - v / this.zoom };
  }

  /** Moves the view by (dx, dy) screen pixels, measured at the centre. For keys. */
  panBy(dx: number, dy: number): void {
    this.cx -= dx / this.zoom;
    this.cy += dy / (this.zoom * Math.cos(this.tilt));
  }

  /**
   * Moves the view so that a map point sits under a screen point. A drag grabs the map
   * point under the pointer and keeps it there, which stays exact on the tilted map.
   */
  pin(map: { x: number; y: number }, sx: number, sy: number): void {
    const under = this.toMap(sx, sy);
    this.cx += map.x - under.x;
    this.cy += map.y - under.y;
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
