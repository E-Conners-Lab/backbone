// Pointer, touch and keyboard input. Touch and mouse share one code path (pointer events).
// Phone: drag between sites, tap a link, pinch to zoom, two-finger pan.
// Desktop: the same with a mouse and wheel; space pauses; 1/2/3 pick tools.

import { panBy, zoomAt, type Camera } from "../render/camera";
import type { Drag, Scene } from "../render/scene";
import type { Game } from "./game";
import type { Hud } from "./hud";

export class Input {
  drag: Drag | null = null;
  /** Site highlighted for keyboard play. */
  focusSite: number | null = null;
  /** Keyboard link in progress: the site it starts from. */
  private keyFrom: number | null = null;
  scene: Scene | null = null;
  cameraMoved = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private down: { x: number; y: number; site: number | null; link: number | null; moved: boolean } | null = null;
  private pinch: { dist: number; mx: number; my: number } | null = null;

  constructor(private canvas: HTMLCanvasElement, private game: Game, private hud: Hud, private cam: () => Camera) {
    canvas.addEventListener("pointerdown", e => this.onDown(e));
    canvas.addEventListener("pointermove", e => this.onMove(e));
    canvas.addEventListener("pointerup", e => this.onUp(e));
    canvas.addEventListener("pointercancel", e => this.onUp(e, true));
    canvas.addEventListener("wheel", e => { e.preventDefault(); zoomAt(this.cam(), e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.0015)); this.cameraMoved = true; }, { passive: false });
    canvas.addEventListener("contextmenu", e => e.preventDefault());
    window.addEventListener("keydown", e => this.onKey(e));
  }

  private siteAt(x: number, y: number, exclude: number | null = null): number | null {
    let best: number | null = null, bestD = Infinity;
    for (const s of this.scene?.sites ?? []) {
      if (s.id === exclude) continue;
      const d = Math.hypot(s.x - x, s.y - y);
      if (d <= s.r && d < bestD) { bestD = d; best = s.id; }
    }
    return best;
  }
  private linkAt(x: number, y: number, slop: number): number | null {
    let best: number | null = null, bestD = slop;
    for (const l of this.scene?.links ?? []) {
      const dx = l.x1 - l.x0, dy = l.y1 - l.y0, len2 = dx * dx + dy * dy || 1;
      const t = Math.min(1, Math.max(0, ((x - l.x0) * dx + (y - l.y0) * dy) / len2));
      const d = Math.hypot(l.x0 + dx * t - x, l.y0 + dy * t - y);
      if (d < bestD) { bestD = d; best = l.id; }
    }
    return best;
  }

  private onDown(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
    if (this.pointers.size === 2) {
      // Second finger: whatever the first was doing becomes pinch-zoom and two-finger pan.
      this.drag = null; this.down = null;
      const [a, b] = [...this.pointers.values()];
      this.pinch = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y), mx: (a!.x + b!.x) / 2, my: (a!.y + b!.y) / 2 };
      return;
    }
    if (this.pointers.size > 2 || this.game.mode !== "play") return;
    const site = this.siteAt(e.offsetX, e.offsetY);
    const link = site === null ? this.linkAt(e.offsetX, e.offsetY, e.pointerType === "touch" ? 22 : 12) : null;
    this.down = { x: e.offsetX, y: e.offsetY, site, link, moved: false };
    if (site !== null) this.drag = { from: site, x: e.offsetX, y: e.offsetY, over: null };
  }

  private onMove(e: PointerEvent): void {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    const px = p.x, py = p.y;
    p.x = e.offsetX; p.y = e.offsetY;
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const dist = Math.hypot(a!.x - b!.x, a!.y - b!.y), mx = (a!.x + b!.x) / 2, my = (a!.y + b!.y) / 2;
      panBy(this.cam(), this.pinch.mx, this.pinch.my, mx, my);
      if (this.pinch.dist > 0) zoomAt(this.cam(), mx, my, dist / this.pinch.dist);
      this.pinch = { dist, mx, my };
      this.cameraMoved = true;
      return;
    }
    if (!this.down) return;
    if (Math.hypot(e.offsetX - this.down.x, e.offsetY - this.down.y) > 8) this.down.moved = true;
    if (this.drag) {
      this.drag.x = e.offsetX; this.drag.y = e.offsetY;
      this.drag.over = this.siteAt(e.offsetX, e.offsetY, this.drag.from);
    } else if (this.down.moved) {
      panBy(this.cam(), px, py, e.offsetX, e.offsetY);
      this.cameraMoved = true;
    }
  }

  private onUp(e: PointerEvent, cancelled = false): void {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    const down = this.down, drag = this.drag;
    this.down = null; this.drag = null;
    if (cancelled || !down || this.game.mode !== "play") return;
    const g = this.game;
    if (drag && drag.over !== null) { g.issue({ type: "layLink", a: drag.from, b: drag.over }); return; }
    if (down.moved) return;
    if (down.link !== null) {
      // A tap on a link opens its options; with the Upgrade tool it upgrades straight away.
      g.selectedLink = down.link;
      if (g.tool === "upgrade") g.issue({ type: "upgrade", link: down.link });
    } else if (down.site !== null) {
      this.focusSite = down.site;
      g.say("Drag from this site to another to lay a link.", "info", 3);
    } else g.selectedLink = null;
  }

  private onKey(e: KeyboardEvent): void {
    const g = this.game, target = e.target as HTMLElement | null;
    const typing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement;
    if (e.key === "Escape") { if (this.keyFrom !== null) { this.keyFrom = null; this.drag = null; } else this.hud.closeTop(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || g.mode !== "play") return;
    const onMap = target === this.canvas;
    switch (e.key) {
      case " ": if (!(target instanceof HTMLButtonElement)) { e.preventDefault(); this.hud.togglePause(); } break;
      case "1": this.hud.setTool("link"); break;
      case "2": this.hud.setTool("cost"); break;
      case "3": this.hud.setTool("upgrade"); break;
      case "i": case "I": this.hud.toggleInspector(); break;
      case "+": case "=": zoomAt(this.cam(), this.cam().w / 2, this.cam().h / 2, 1.2); this.cameraMoved = true; break;
      case "-": case "_": zoomAt(this.cam(), this.cam().w / 2, this.cam().h / 2, 1 / 1.2); this.cameraMoved = true; break;
      case "ArrowLeft": case "ArrowRight": case "ArrowUp": case "ArrowDown":
        if (onMap) { e.preventDefault(); this.moveFocus(e.key); }
        break;
      case "Enter":
        if (!onMap || this.focusSite === null) break;
        e.preventDefault();
        if (this.keyFrom === null) { this.keyFrom = this.focusSite; g.say("Link started. Move to another site and press Enter. Escape cancels.", "info", 6); }
        else { if (this.keyFrom !== this.focusSite) g.issue({ type: "layLink", a: this.keyFrom, b: this.focusSite }); this.keyFrom = null; this.drag = null; }
        break;
      default: break;
    }
  }

  /** Moves keyboard focus to the nearest site in the arrow's direction. */
  private moveFocus(key: string): void {
    const sites = this.scene?.sites ?? [];
    if (sites.length === 0) return;
    const cur = sites.find(s => s.id === this.focusSite);
    if (!cur) { this.focusSite = sites[0]!.id; }
    else {
      const [vx, vy] = key === "ArrowLeft" ? [-1, 0] : key === "ArrowRight" ? [1, 0] : key === "ArrowUp" ? [0, -1] : [0, 1];
      let best: number | null = null, bestScore = Infinity;
      for (const s of sites) {
        if (s.id === cur.id) continue;
        const dx = s.x - cur.x, dy = s.y - cur.y, along = dx * vx + dy * vy, across = Math.abs(dx * vy - dy * vx);
        if (along <= 0) continue;
        const score = along + across * 2;
        if (score < bestScore) { bestScore = score; best = s.id; }
      }
      if (best !== null) this.focusSite = best;
    }
    const f = sites.find(s => s.id === this.focusSite);
    if (this.keyFrom !== null && f) this.drag = { from: this.keyFrom, x: f.x, y: f.y, over: this.keyFrom === f.id ? null : f.id };
  }
}
