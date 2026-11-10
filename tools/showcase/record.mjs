// Records the showcase run: the showcase player (tools/showcase/player.ts) plays one seeded run
// in the real built game, at normal speed, through real mouse and keyboard input, with a caption
// for every decision. Along the way it shows each feature once: the inspector, a keyboard-laid
// link, zoom, a refused link, a cut link that cannot be removed, paused and queued changes.
//
// Usage: node tools/showcase/record.mjs --seed NAME [--headed] [--size 1920x1080] [--out docs/showcase] [--max-min 30]
//   --headed   opens a visible window and waits on the welcome screen until Enter is pressed there.
// Needs dist/ (npm run build) and ffmpeg. Serves dist/ itself on a free local port.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize, resolve, sep } from "node:path";
import { loadTs } from "./load.mjs";

const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : fallback; };
const seed = opt("seed", "stage-1");
const headed = argv.includes("--headed");
/** Test aid: takes the wait-for-Enter path without a person, clicking Start first to prove the click is absorbed. */
const selfTestWait = argv.includes("--selftest-wait");
const [width, height] = opt("size", "1920x1080").split("x").map(Number);
const outDir = opt("out", "docs/showcase");
const maxMin = Number(opt("max-min", "30"));
/** Rehearsal only: runs the simulation faster to exercise the driver. The recorded run uses 1. */
const speed = Number(opt("speed", "1"));
if (!/^[A-Za-z0-9-]{1,24}$/.test(seed) || !(width > 0) || !(height > 0)) throw new Error("bad --seed or --size");

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- the real simulation and the player, loaded from source ----------
const { modules: [sim, spf, player], close: closeVite } = await loadTs("/src/sim/world.ts", "/src/sim/spf.ts", "/tools/showcase/player.ts");

// ---------- a static server for dist/ ----------
const root = resolve("dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff" };
const server = http.createServer(async (req, res) => {
  try {
    let path = normalize(decodeURIComponent(new URL(req.url, "http://localhost").pathname));
    if (path.endsWith(sep) || path === "/") path = join(path, "index.html");
    const file = join(root, path);
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

// ---------- browser ----------
const browser = await chromium.launch({
  headless: !headed,
  args: headed ? [`--window-size=${width},${height + 90}`, "--window-position=40,40", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-background-timer-throttling"] : [],
});
const videoTmp = mkdtempSync(join(tmpdir(), "backbone-showcase-"));
const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, recordVideo: { dir: videoTmp, size: { width, height } } });
const videoStart = Date.now();
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(String(e)));

// The caption box and a visible pointer are drawn over the page. They are not part of the game
// and take no input (pointer-events: none).
await page.addInitScript(() => {
  const css = `
#sc-cap{position:fixed;left:16px;bottom:76px;width:min(31vw,600px);z-index:50;pointer-events:none;box-sizing:border-box;
  font:500 17px/1.42 "IBM Plex Sans",system-ui,sans-serif;color:#eaf6ff;background:rgba(5,10,24,.9);border:1px solid rgba(63,224,255,.5);
  border-left:4px solid #3fe0ff;border-radius:8px;padding:12px 14px;opacity:0;transition:opacity .25s}
#sc-cap.on{opacity:1}
#sc-cap b{display:block;font:700 12px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.18em;color:#3fe0ff;margin-bottom:7px;text-transform:uppercase}
#sc-cap[data-tone="fail"]{border-color:rgba(255,43,214,.6);border-left-color:#ff2bd6} #sc-cap[data-tone="fail"] b{color:#ff2bd6}
#sc-cap[data-tone="warn"]{border-color:rgba(255,176,32,.6);border-left-color:#ffb020} #sc-cap[data-tone="warn"] b{color:#ffb020}
#sc-cap.center{left:50%;bottom:auto;top:16px;transform:translateX(-50%);width:min(60vw,900px);text-align:center;z-index:200}
#sc-shield{position:fixed;inset:0;z-index:150;background:rgba(5,10,24,.35);cursor:default}
#sc-cur{position:fixed;z-index:300;pointer-events:none;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #fff;
  background:rgba(255,255,255,.22);box-shadow:0 0 10px rgba(255,255,255,.7);left:-60px;top:-60px;transition:transform .08s,background .08s}
#sc-cur.down{background:rgba(63,224,255,.85);transform:scale(.75)}`;
  let hideTimer = 0;
  const ready = () => {
    const style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);
    const cap = document.createElement("div"); cap.id = "sc-cap"; cap.setAttribute("aria-hidden", "true");
    const tag = document.createElement("b"), text = document.createElement("span"); cap.append(tag, text);
    const cur = document.createElement("div"); cur.id = "sc-cur"; cur.setAttribute("aria-hidden", "true");
    // While a headed run waits for Enter, this covers the page so a click cannot start the game or press anything.
    const shield = document.createElement("div"); shield.id = "sc-shield"; shield.hidden = true;
    document.body.append(cap, cur, shield);
    const follow = e => { cur.style.left = `${e.clientX}px`; cur.style.top = `${e.clientY}px`; };
    for (const type of ["pointermove", "mousemove"]) document.addEventListener(type, follow, true);
    document.addEventListener("pointerdown", () => cur.classList.add("down"), true);
    document.addEventListener("pointerup", () => cur.classList.remove("down"), true);
    window.__showcase = {
      go: false,
      caption(tagText, body, tone, seconds, center) {
        tag.textContent = tagText; text.textContent = body; cap.dataset.tone = tone; cap.classList.toggle("center", !!center); cap.classList.add("on");
        clearTimeout(hideTimer); hideTimer = setTimeout(() => cap.classList.remove("on"), seconds * 1000);
      },
      hide() { cap.classList.remove("on"); },
      shield(on) { shield.hidden = !on; },
    };
    // Headed runs wait for Enter. Caught before the game sees it, so it does not start the run by itself.
    window.addEventListener("keydown", e => {
      if (window.__showcase.go || e.key !== "Enter") return;
      e.preventDefault(); e.stopImmediatePropagation(); window.__showcase.go = true;
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
});

// ---------- state read from the page ----------
const chapters = [];
const stats = { moves: {}, uiActions: 0, directFallbacks: 0, skipped: 0, demos: [] };
let videoOffsetMs = 0;          // trimmed from the front of the video (the wait for Enter)
let lastCaptionAt = 0;
let gameClock = "0:00";

async function caption(tag, text, tone = "info", seconds = 7, center = false) {
  lastCaptionAt = Date.now();
  chapters.push({ video: Math.max(0, Math.round((Date.now() - videoStart - videoOffsetMs) / 1000)), game: gameClock, tag, text });
  console.log(`[${gameClock}] ${tag}: ${text}`);
  await page.evaluate(([a, b, c, d, e]) => window.__showcase.caption(a, b, c, d, e), [tag, text, tone, seconds, center]);
}

/** The live world, rebuilt in Node so the player can read it and forecast from it. */
async function snapshot() {
  const s = await page.evaluate(() => {
    const g = window.__backbone.game, w = g.world;
    return { mode: g.mode, paused: g.paused, pending: g.pending.length, selected: g.selectedLink, tool: g.tool, world: JSON.stringify({ ...w, routes: null }) };
  });
  const w = JSON.parse(s.world);
  w.routes = spf.computeRoutes(sim.presentSites(w).map(x => x.id), w.links, w.tuning.maxPaths);
  const sec = Math.floor(w.step / w.tuning.stepsPerSec);
  gameClock = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  return { ...s, world: w };
}
/** The world as it will be once queued changes apply (same as the live world when nothing is queued). */
const effective = () => page.evaluate(() => {
  const g = window.__backbone.game, w = g.preview ?? g.world;
  return { paused: g.paused, reward: g.world.pendingReward !== null, selected: g.selectedLink, fiberKm: w.fiberKm, upgrades: w.upgrades,
    links: w.links.map(l => ({ id: l.id, a: l.a, b: l.b, cost: l.cost, tier: l.tier, up: l.up })) };
});
const geometry = () => page.evaluate(() => {
  const s = window.__backbone.scene;
  return { sites: s.sites.map(x => ({ id: x.id, x: x.x, y: x.y, r: x.r })), links: s.links.map(l => ({ id: l.id, x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1 })) };
});
const isMapAt = (x, y) => page.evaluate(([px, py]) => document.elementFromPoint(px, py)?.id === "ov", [x, y]);
async function until(check, ms = 900) {
  const end = Date.now() + ms;
  for (;;) { const v = await check(); if (v || Date.now() > end) return v; await sleep(40); }
}

// ---------- real input ----------
let mouse = { x: width / 2, y: height / 2 };
async function glide(x, y, speed = 1) {
  const dist = Math.hypot(x - mouse.x, y - mouse.y);
  const steps = Math.max(6, Math.min(34, Math.round(dist / 34 / speed)));
  const from = { ...mouse };
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, e = t * t * (3 - 2 * t);
    await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
    await sleep(13);
  }
  mouse = { x, y };
}
async function clickAt(x, y) {
  await glide(x, y); await sleep(110);
  await page.mouse.down(); await sleep(70); await page.mouse.up();
  stats.uiActions++;
}
async function clickEl(selector) {
  const target = page.locator(selector);
  if ((await target.count()) === 0) return false;
  await target.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});   // a row far down the inspector's table
  const box = (await target.isVisible()) ? await target.boundingBox() : null;
  if (!box) return false;
  await clickAt(box.x + box.width / 2, box.y + box.height / 2);
  return true;
}
async function key(k) { await page.keyboard.press(k); stats.uiActions++; }

async function setPaused(want) {
  const now = await effective();
  if (now.reward) return false;                    // the reward dialog holds the clock; pause does nothing
  if (now.paused === want) return true;
  // Space pauses unless a button has focus (there it would press the button), so use the pause button then.
  const onControl = await page.evaluate(() => { const a = document.activeElement; return a instanceof HTMLButtonElement || a instanceof HTMLInputElement || a instanceof HTMLSelectElement; });
  if (onControl) await clickEl("#pauseBtn"); else await key("Space");
  return !!(await until(async () => (await effective()).paused === want));
}
async function closeCard() {
  if ((await effective()).selected !== null) await clickEl("#cardClose");
}
async function closePanels() {
  await closeCard();
  if (await page.locator("#inspector").isVisible()) await clickEl("#inspectClose");
}

/** A point on the link that a click will resolve to this link and nothing else. */
async function linkPoint(id) {
  const g = await geometry();
  const l = g.links.find(x => x.id === id);
  if (!l) return null;
  const distTo = (o, x, y) => { const dx = o.x1 - o.x0, dy = o.y1 - o.y0, len2 = dx * dx + dy * dy || 1;
    const t = Math.min(1, Math.max(0, ((x - o.x0) * dx + (y - o.y0) * dy) / len2)); return Math.hypot(o.x0 + dx * t - x, o.y0 + dy * t - y); };
  for (const t of [0.5, 0.42, 0.58, 0.34, 0.66, 0.27, 0.73, 0.2, 0.8]) {
    const x = l.x0 + (l.x1 - l.x0) * t, y = l.y0 + (l.y1 - l.y0) * t;
    if (g.sites.some(s => Math.hypot(s.x - x, s.y - y) <= s.r + 6)) continue;
    if (g.links.some(o => o.id !== id && distTo(o, x, y) < 5)) continue;
    if (await isMapAt(x, y)) return { x, y };
  }
  return null;
}

/** Opens the link's options: a click on the link, or the inspector's Edit button when the link cannot be clicked cleanly. */
async function openCard(id) {
  if ((await effective()).selected === id) return true;
  await closeCard();
  if ((await page.evaluate(() => window.__backbone.game.tool)) !== "link") await key("1");
  const p = await linkPoint(id);
  if (p) { await clickAt(p.x, p.y); if (await until(async () => (await effective()).selected === id, 500)) return true; }
  if (!(await page.locator("#inspector").isVisible())) { await key("i"); await sleep(350); }
  const ok = await clickEl(`#linkRows tr[data-link="${id}"] button`);
  const open = ok && await until(async () => (await effective()).selected === id, 500);
  await sleep(500);
  if (await page.locator("#inspector").isVisible()) await clickEl("#inspectClose");
  return !!open;
}

const sitePoint = async id => (await geometry()).sites.find(s => s.id === id) ?? null;

async function dragLink(a, b, holdMs = 280) {
  await closePanels();
  const pa = await sitePoint(a), pb = await sitePoint(b);
  if (!pa || !pb || !(await isMapAt(pa.x, pa.y)) || !(await isMapAt(pb.x, pb.y))) return false;
  await glide(pa.x, pa.y); await sleep(120);
  await page.mouse.down(); await sleep(90);
  await glide(pb.x, pb.y, 0.6); await sleep(holdMs);
  await page.mouse.up();
  stats.uiActions++;
  return true;
}

/** The inspector's form: pick two sites, read the path line, press "Lay link". */
async function formLink(a, b) {
  await closeCard();
  if (!(await page.locator("#inspector").isVisible())) { await key("i"); await sleep(400); }
  await page.selectOption("#fromSite", String(a)); await sleep(500);
  await page.selectOption("#toSite", String(b)); await sleep(1400);
  await clickEl("#layBtn"); await sleep(700);
  await clickEl("#inspectClose");
  return true;
}

/** Arrow presses that walk keyboard focus from one site to another, using the game's own rule. */
function arrowPath(sites, from, to) {
  const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const next = (id, [vx, vy]) => {
    const cur = sites.find(s => s.id === id); let best = null, bestScore = Infinity;
    for (const s of sites) {
      if (s.id === id) continue;
      const dx = s.x - cur.x, dy = s.y - cur.y, along = dx * vx + dy * vy, across = Math.abs(dx * vy - dy * vx);
      if (along <= 0) continue;
      const score = along + across * 2;
      if (score < bestScore) { bestScore = score; best = s.id; }
    }
    return best;
  };
  const seen = new Map([[from, []]]), queue = [from];
  while (queue.length) {
    const id = queue.shift(), path = seen.get(id);
    if (id === to) return path;
    if (path.length >= 5) continue;
    for (const [k, v] of Object.entries(KEYS)) { const n = next(id, v); if (n !== null && !seen.has(n)) { seen.set(n, [...path, k]); queue.push(n); } }
  }
  return null;
}
async function keyboardLink(a, b) {
  await closePanels();
  const g = await geometry();
  const path = arrowPath(g.sites, a, b), pa = g.sites.find(s => s.id === a);
  if (!path || !pa || !(await isMapAt(pa.x, pa.y))) return false;
  await clickAt(pa.x, pa.y); await sleep(500);          // a click on a site gives it keyboard focus
  await key("Enter"); await sleep(600);
  for (const k of path) { await key(k); await sleep(480); }
  await sleep(300); await key("Enter");
  return true;
}

// ---------- one command, done by hand, then checked against the game's own state ----------
let upgradesDone = 0;
const hasLink = (e, a, b) => e.links.some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));

async function perform(c, how = {}) {
  const before = await effective();
  let done;
  if (c.type === "chooseReward") {
    await clickEl(c.choice === "fiber" ? "#rewardFiber" : "#rewardUpgrade");
    done = async () => !(await effective()).reward;
  } else if (c.type === "layLink") {
    const ok = how.keyboard ? await keyboardLink(c.a, c.b) : how.form ? await formLink(c.a, c.b) : await dragLink(c.a, c.b);
    if (!ok && !how.form) await formLink(c.a, c.b);
    done = async () => hasLink(await effective(), c.a, c.b);
  } else if (c.type === "upgrade") {
    const tier = before.links.find(l => l.id === c.link)?.tier ?? 0;
    const p = upgradesDone++ % 2 === 1 ? await linkPoint(c.link) : null;
    if (p) {            // the Upgrade tool: one tap on the link
      await closeCard(); await key("3"); await sleep(350); await clickAt(p.x, p.y); await sleep(500); await key("1"); await sleep(500); await closeCard();
    } else if (await openCard(c.link)) { await sleep(500); await clickEl("#cardUpgrade"); await sleep(700); await closeCard(); }
    done = async () => ((await effective()).links.find(l => l.id === c.link)?.tier ?? 0) === tier + 1;
  } else if (c.type === "setCost") {
    if (await openCard(c.link)) {
      await sleep(400);
      const cur = (await effective()).links.find(l => l.id === c.link)?.cost ?? c.cost;
      const diff = c.cost - cur;
      if (Math.abs(diff) <= 2) for (let i = 0; i < Math.abs(diff); i++) { await clickEl(diff > 0 ? "#costUp" : "#costDown"); await sleep(260); }
      else {
        await clickEl("#costInput"); await page.keyboard.press("ControlOrMeta+A"); await sleep(150);
        await page.keyboard.type(String(c.cost), { delay: 110 }); await sleep(200); await page.keyboard.press("Enter");
        stats.uiActions += 2;
      }
      await sleep(600); await closeCard();
    }
    done = async () => (await effective()).links.find(l => l.id === c.link)?.cost === c.cost;
  } else {
    if (await openCard(c.link)) { await sleep(600); await clickEl("#cardRemove"); }
    done = async () => !(await effective()).links.some(l => l.id === c.link);
  }
  if (await until(done, 900)) return "ui";
  // The hand-made input did not take (for example the map moved under the pointer). Give the same
  // command to the game directly so the run continues, and count it.
  await page.evaluate(cmd => window.__backbone.game.issue(cmd), c);
  if (await until(done, 600)) { stats.directFallbacks++; console.log(`  (direct fallback: ${JSON.stringify(c)})`); return "direct"; }
  stats.skipped++; console.log(`  (skipped, no longer valid: ${JSON.stringify(c)})`);
  return "skipped";
}

// A run can end early: the window is closed, the process is asked to stop, or an input times out.
// Whatever happens, what was recorded so far is still converted and written out below.
let stopReason = "over", runError = null, lastKnown = null, stopRequested = false;
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => { stopRequested = true; });

try {
// ---------- the opening ----------
await page.goto(base);
await page.waitForFunction(() => window.__backbone && window.__showcase);
await sleep(800);
if (headed || selfTestWait) {
  await page.bringToFront();
  await page.evaluate(() => { window.__showcase.shield(true); window.__showcase.caption("Ready when you are", "Start your screen recorder, then click anywhere in this window and press Enter to begin the run.", "info", 36000, true); });
  if (selfTestWait) {      // what a person might do: click the Start button, then press Enter
    const box = await page.locator("#startBtn").boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await sleep(500);
    const mode = await page.evaluate(() => window.__backbone.game.mode);
    if (mode !== "welcome") throw new Error(`self-test: a click got through the shield (mode ${mode})`);
    console.log("self-test: click on Start was absorbed; pressing Enter");
    await page.keyboard.press("Enter");
  }
  console.log("WAITING: the window is open. Press Enter in it to begin.");
  await page.waitForFunction(() => window.__showcase.go, null, { timeout: 0, polling: 200 });
  videoOffsetMs = Date.now() - videoStart;
  await page.evaluate(() => { window.__showcase.hide(); window.__showcase.shield(false); });
  await sleep(600);
}
await page.evaluate(() => { window.__showcase.go = true; });      // from here Enter belongs to the game
await caption("Backbone", "A full run by the showcase player, at normal speed, with real mouse and keyboard input. Captions explain each decision.", "info", 6, true);
await sleep(4200);
await clickEl("#aboutBtn");
await caption("Showing", "About the model: what is faithful to OSPF (RFC 2328) and what is simplified for play.", "info", 6, true);
await sleep(5200);
await clickEl("#aboutClose"); await sleep(600);
await clickEl("#seedInput"); await page.keyboard.press("ControlOrMeta+A"); await page.keyboard.type(seed, { delay: 90 });
await caption("Seed", `Seed "${seed}": the same seed gives the same cities, traffic and fiber cuts every time.`, "info", 5, true);
await sleep(2600);
await clickEl("#startBtn");
await page.waitForFunction(() => window.__backbone.game.mode === "play");
if (speed !== 1) await page.evaluate(v => { window.__backbone.game.speed = v; }, speed);
await sleep(500);

// ---------- the run ----------
const TAGS = { reward: "Reward", connect: "New site", rescue: "Fiber cut", reclaim: "Out of fiber", upgrade: "Capacity", redundancy: "Redundancy", retune: "Congestion" };
const TONES = { rescue: "fail", reclaim: "warn", retune: "warn" };
const mem = player.newMemory();
const demo = { inspector: false, refused: false, cutRemove: false, keyboard: false, zoom: false };
const name = (w, l) => `${sim.siteById(w, l.a)?.code}–${sim.siteById(w, l.b)?.code}`;
let lastDecideStep = -1e9, prevUp = new Map();

/** Pause with a caption, run the body, resume. Returns false if the pause could not be taken (a reward came up). */
async function pausedBeat(tag, text, tone, body, readMs = 1700) {
  if (!(await setPaused(true))) return false;
  const wait = 2400 - (Date.now() - lastCaptionAt);
  if (wait > 0) await sleep(wait);
  await caption(tag, text, tone, 12);
  await sleep(readMs);
  await body();
  await sleep(1300);
  await setPaused(false);
  return true;
}

for (;;) {
  const s = await snapshot();
  const w = s.world, sps = w.tuning.stepsPerSec;
  if (s.mode !== "play") break;
  lastKnown = { mode: s.mode, stepsPerSec: sps, delivered: w.delivered, dropped: w.dropped, steps: w.step, links: w.links.length };
  if (stopRequested) { stopReason = "stopped"; break; }
  if (w.step > maxMin * 60 * sps) { stopReason = "max-min"; break; }

  // Things the game did on its own since the last look.
  let acted = false;
  for (const l of w.links) {
    const was = prevUp.get(l.id);
    if (was === true && !l.up) {
      const dark = w.sites.filter(x => sim.isDark(w, x)).map(x => x.code);
      await caption("Fiber cut", dark.length > 0 ? `${name(w, l)} is cut and ${dark.join(", ")} had no other link: dark until there is another path.`
        : `${name(w, l)} is cut. Every router recalculates at once and its traffic lands on the second path. Watch which links turn amber.`, "fail", 7);
      if (!demo.cutRemove && dark.length === 0) {
        await sleep(2600);
        let shown = false;
        await pausedBeat("Showing", `A cut link cannot be removed and re-laid to dodge the outage. Trying Remove on ${name(w, l)}:`, "info", async () => {
          if (await openCard(l.id)) { await sleep(1500); shown = await clickEl("#cardRemove"); await sleep(2600); await closeCard(); }
        });
        if (shown) { demo.cutRemove = true; stats.demos.push("cut link cannot be removed"); }
      }
      acted = true;
    } else if (was === false && l.up && Date.now() - lastCaptionAt > 2500) await caption("Repaired", `${name(w, l)} is back. Routes return to the lowest-cost paths.`, "info", 4);
  }
  prevUp = new Map(w.links.map(l => [l.id, l.up]));
  if (acted) continue;                               // time has passed: look again before deciding anything

  // Feature demonstrations that are not decisions.
  const present = sim.presentSites(w);
  if (!demo.inspector && w.step > 26 * sps && w.links.length >= 2 && !w.pendingReward) {
    const far = present.flatMap(a => present.map(b => ({ a, b, r: w.routes.get(a.id)?.get(b.id) }))).filter(x => x.r && x.a.id < x.b.id).sort((x, y) => y.r.cost - x.r.cost)[0];
    const shown = await pausedBeat("Showing", "The inspector (I): every link as a table, and the lowest-cost path between any two sites. Paused, links also show their utilization.", "info", async () => {
      await key("i"); await sleep(1800);
      if (far) { await page.selectOption("#fromSite", String(far.a.id)); await sleep(700); await page.selectOption("#toSite", String(far.b.id)); await sleep(3200); }
      await clickEl("#inspectClose");
    });
    if (shown) { demo.inspector = true; stats.demos.push("inspector and lowest-cost path"); }
    continue;
  }
  if (!demo.refused && w.step > 70 * sps && !w.pendingReward && w.step % (40 * sps) > 22 * sps) {
    const tooFar = present.flatMap(a => present.map(b => ({ a, b, km: sim.linkKm(w, a.id, b.id) })))
      .filter(x => x.a.id < x.b.id && !sim.linkBetween(w, x.a.id, x.b.id) && x.km > w.fiberKm).sort((x, y) => x.km - y.km)[0];
    if (tooFar) {
      let dragged = false;
      await pausedBeat("Showing", `The drag shows a link's length. ${tooFar.a.code}–${tooFar.b.code} is ${tooFar.km.toLocaleString("en-US")} km and only ${w.fiberKm.toLocaleString("en-US")} km of fiber is left, so it is refused.`, "info", async () => {
        dragged = await dragLink(tooFar.a.id, tooFar.b.id, 1800); await sleep(2200);
      });
      if (dragged) { demo.refused = true; stats.demos.push("link refused: not enough fiber"); }
      continue;
    }
  }

  if (!w.pendingReward && w.step - lastDecideStep < sps) { await sleep(110); continue; }
  lastDecideStep = w.step;
  const move = player.decide(w, mem);
  if (!move) { await sleep(110); continue; }
  stats.moves[move.kind] = (stats.moves[move.kind] ?? 0) + 1;
  const tag = TAGS[move.kind], tone = TONES[move.kind] ?? "info";

  if (move.kind === "reward") {
    await caption(tag, move.why, tone, 9);
    await sleep(3000);                                  // the clock is stopped while the choice is open
    await perform(move.commands[0]);
    await sleep(500);
    continue;
  }
  const useKeyboard = move.kind === "redundancy" && !demo.keyboard && w.step > 45 * sps;
  const tooSoon = Date.now() - lastCaptionAt < 2400;
  if (move.kind === "retune" || move.kind === "reclaim" || useKeyboard || tooSoon) {
    // Changes made while paused are queued and all apply together on resume.
    const zoom = move.kind === "retune" && !demo.zoom;
    const why = useKeyboard ? `${move.why} Laid with the keyboard this time: arrows move between sites, Enter starts and finishes a link.` : move.why;
    const ok = await pausedBeat(tag, why, tone, async () => {
      if (useKeyboard) { demo.keyboard = true; stats.demos.push("keyboard-laid link"); }
      let at = null;
      if (zoom) {
        const first = move.commands.find(c => c.type === "setCost");
        at = first ? await linkPoint(first.link) : null;
        if (at) { demo.zoom = true; stats.demos.push("zoom"); await glide(at.x, at.y); await page.mouse.wheel(0, -260); await sleep(500); await page.mouse.wheel(0, -260); await sleep(900); }
      }
      for (const c of move.commands) { await perform(c, { keyboard: useKeyboard, form: move.kind === "reclaim" && c.type === "layLink" }); await sleep(500); }
      if (at) { await sleep(600); await glide(at.x, at.y); await page.mouse.wheel(0, 260); await sleep(400); await page.mouse.wheel(0, 260); await sleep(500); }
    }, move.kind === "retune" ? (stats.moves.retune <= 6 ? 3200 : 1500) : 1900);
    if (!ok) { mem.planned = move.kind === "retune" ? null : move; mem.lastRetuneStep = -1e9; }   // a reward came up first: decide again after it
  } else {
    await caption(tag, move.why, tone, 7);
    for (const c of move.commands) await perform(c);
  }
}

} catch (e) {
  stopReason = stopRequested ? "stopped" : "error";
  runError = String(e?.message ?? e).split("\n")[0];
  console.log(`run ended early (${stopReason}): ${runError}`);
}

// ---------- the ending ----------
const readEnd = () => page.evaluate(() => { const b = window.__backbone, g = b.game, w = g.world;
  return { mode: g.mode, stepsPerSec: w.tuning.stepsPerSec, delivered: w.delivered, dropped: w.dropped, steps: w.step, links: w.links.length, commands: g.log.length, renderer: b.renderer, frameMs: Math.round(b.frameMs() * 10) / 10 }; });
const end = (await readEnd().catch(() => null)) ?? lastKnown ?? { mode: "unknown", stepsPerSec: 20, delivered: 0, dropped: {}, steps: 0, links: 0 };
const seconds = Math.floor(end.steps / end.stepsPerSec);
try {
if (stopReason === "over") {
  await caption("Network down", `The drop meter filled after ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}. Traffic grows every minute, so every run ends. Behind the score, the whole run replays as a time-lapse.`, "fail", 16);
  await sleep(19000);
} else if (stopReason === "max-min") { await caption("Recording stopped", `Still running after ${maxMin} minutes. The recording stops here.`, "info", 5); await sleep(5000); }
} catch { /* the page is already gone */ }
await context.close().catch(() => {});
await browser.close().catch(() => {});
server.close();
await closeVite();

mkdirSync(outDir, { recursive: true });
const webmName = readdirSync(videoTmp).find(f => f.endsWith(".webm"));
if (!webmName) { console.log(JSON.stringify({ seed, stopReason, runError, video: null, note: "no video was captured" })); process.exit(1); }
const webm = join(videoTmp, webmName);
const stem = `showcase-${seed}-${width}x${height}`;
const mp4 = join(outDir, `${stem}.mp4`);
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", (videoOffsetMs / 1000).toFixed(2), "-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4]);
rmSync(videoTmp, { recursive: true, force: true });
const result = { seed, size: `${width}x${height}`, headed, stopReason, runError, timeSurvived: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`, ...end, ...stats, video: mp4, videoBytes: statSync(mp4).size, pageErrors, chapters };
writeFileSync(join(outDir, `${stem}.json`), JSON.stringify(result, null, 2) + "\n");
const clock = t => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
writeFileSync(join(outDir, `${stem}-chapters.md`), `# Showcase run, seed \`${seed}\`\n\nVideo: \`${stem}.mp4\`. Survived ${result.timeSurvived}, delivered ${end.delivered.toLocaleString("en-US")}.\n\n| Video | Game clock | What | Caption |\n| --- | --- | --- | --- |\n`
  + chapters.map(c => `| ${clock(c.video)} | ${c.game} | ${c.tag} | ${c.text.replaceAll("|", "/")} |`).join("\n") + "\n");
console.log(JSON.stringify({ ...result, chapters: chapters.length }));
if (stopReason === "error") process.exitCode = 1;
