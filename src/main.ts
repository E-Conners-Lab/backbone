import "./style.css";
import { REGION_NA } from "./content/region-na";
import { fitCamera, type Camera, type Insets } from "./render/camera";
import { drawBackdrop, drawOverlay, drawShapes2d, sizeCanvas } from "./render/canvas";
import { GlRenderer } from "./render/gl";
import { buildScene, type Scene } from "./render/scene";
import { DEFAULT_TUNING } from "./sim/world";
import { Game } from "./ui/game";
import { Hud } from "./ui/hud";
import { Input } from "./ui/input";
import { SEED_PATTERN } from "./ui/scores";

// URL switches, each checked against an allowlist before use.
const params = new URLSearchParams(location.search);
const seedParam = params.get("seed");
const speedParam = Number(params.get("speed"));
const options = {
  seed: seedParam !== null && SEED_PATTERN.test(seedParam) ? seedParam : null,
  speed: Number.isInteger(speedParam) && speedParam >= 1 && speedParam <= 32 ? speedParam : 1,
  bot: params.get("bot") === "1",
  force2d: params.get("renderer") === "2d",
  reducedParam: params.get("motion") === "reduced",
  /** Hides the HUD so the map alone can be captured for the hero art and card image. */
  heroShot: params.get("hero") === "1",
};
if (options.heroShot) document.body.classList.add("hero-shot");

const MOTION_KEY = "backbone.motion";
const storedMotion = ((): string | null => { try { return localStorage.getItem(MOTION_KEY); } catch { return null; } })();
let reduced = options.reducedParam || (storedMotion === "reduced" || (storedMotion !== "full" && matchMedia("(prefers-reduced-motion: reduce)").matches));

const canvas = (id: string): HTMLCanvasElement => document.getElementById(id) as HTMLCanvasElement;
const bg = canvas("bg"), ov = canvas("ov");
let lit = canvas("lit");
const bgCtx = bg.getContext("2d")!, ovCtx = ov.getContext("2d")!;
// WebGL2 when available; otherwise (or with ?renderer=2d) the Canvas 2D fallback draws the same shapes.
let gl = options.force2d ? null : GlRenderer.create(lit);
let litCtx: CanvasRenderingContext2D | null = null;
let rendererName = gl ? "webgl2" : "canvas2d";
function fallBackTo2d(): void {
  // A canvas that has held a WebGL context cannot give a 2D one, so swap in a fresh canvas.
  const fresh = document.createElement("canvas");
  fresh.id = "lit"; fresh.setAttribute("aria-hidden", "true");
  lit.replaceWith(fresh); lit = fresh;
  gl = null; litCtx = lit.getContext("2d"); rendererName = "canvas2d";
  sizeCanvas(lit, window.innerWidth, window.innerHeight, 2);
}
// Also at startup: if WebGL setup failed part-way, the canvas may already hold a WebGL context.
if (!gl) fallBackTo2d();

const game = new Game(REGION_NA, DEFAULT_TUNING);
game.speed = options.speed;
game.bot = options.bot;

const hud = new Hud(game, {
  start: seed => { game.start(seed); refit(); },
  setReduced: on => { reduced = on; try { localStorage.setItem(MOTION_KEY, on ? "reduced" : "full"); } catch { /* not stored */ } backdropDirty = true; },
  reduced: () => reduced,
});

let cam: Camera;
let backdropDirty = true;
let dpr = 1;
const input = new Input(ov, game, hud, () => cam);

function insets(w: number, h: number): Insets {
  const u = Math.min(20, Math.max(11, h * 0.0155));
  if (h <= 520) return { top: 50, right: 14, bottom: 14, left: 118 };          // phone landscape: tools on the left
  if (w <= 560) return { top: u * 9.5, right: 10, bottom: u * 11, left: 10 };   // phone portrait
  return { top: u * 5.2, right: 16, bottom: u * 5.6, left: 16 };
}
function refit(): void {
  const w = window.innerWidth, h = window.innerHeight;
  cam = fitCamera(w, h, REGION_NA, insets(w, h));
  dpr = sizeCanvas(bg, w, h, 2); sizeCanvas(lit, w, h, 2); sizeCanvas(ov, w, h, 2);
  backdropDirty = true;
}
refit();
window.addEventListener("resize", refit);

let scene: Scene | null = null;
let last = performance.now();
const frameTimes: number[] = [];
function frame(now: number): void {
  const dt = now - last;
  last = now;
  frameTimes.push(dt); if (frameTimes.length > 120) frameTimes.shift();
  game.tick(dt);
  if (input.cameraMoved) { backdropDirty = true; input.cameraMoved = false; }
  if (backdropDirty) { drawBackdrop(bgCtx, cam, dpr, !reduced); backdropDirty = false; }
  scene = buildScene(game, cam, { reduced, drag: input.drag, focusSite: input.focusSite, showUtil: game.paused });
  input.scene = scene;
  if (gl?.lost) fallBackTo2d();
  if (gl) gl.draw(scene, cam.w, cam.h, dpr); else if (litCtx) drawShapes2d(litCtx, scene, cam.w, cam.h, dpr);
  drawOverlay(ovCtx, scene, cam.w, cam.h, dpr);
  hud.update(now);
  if (censusWaiters.length > 0) { const result = hueCensus(); for (const done of censusWaiters.splice(0)) done(result); }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (options.seed) { game.start(options.seed); refit(); }

// Test aid for AC18: counts strongly colored pixels of the finished frame that fall in a green
// or red hue band. Runs inside the frame, right after drawing, so the WebGL canvas is readable.
interface HueCensus { total: number; colored: number; green: number; red: number }
const censusWaiters: ((c: HueCensus) => void)[] = [];
function hueCensus(): HueCensus {
  const c = document.createElement("canvas");
  c.width = Math.round(cam.w / 2); c.height = Math.round(cam.h / 2);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  for (const layer of [bg, lit, ov]) ctx.drawImage(layer, 0, 0, c.width, c.height);
  const px = ctx.getImageData(0, 0, c.width, c.height).data;
  const out: HueCensus = { total: px.length / 4, colored: 0, green: 0, red: 0 };
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i]! / 255, g = px[i + 1]! / 255, b = px[i + 2]! / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (max < 0.35 || d / max < 0.45) continue;
    out.colored++;
    const hue = (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
    if (hue >= 80 && hue <= 165) out.green++; else if (hue < 20 || hue > 345) out.red++;
  }
  return out;
}

// Read-only handle for the end-to-end tests and the run recorder. Not used by the game itself.
declare global { interface Window { __backbone: unknown } }
window.__backbone = {
  game,
  get scene() { return scene; },
  get renderer() { return rendererName; },
  get reduced() { return reduced; },
  hueCensus: () => new Promise<HueCensus>(resolve => censusWaiters.push(resolve)),
  frameMs: () => frameTimes.length ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length : 0,
};
