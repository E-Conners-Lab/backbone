// Makes the hero art and Arcade card image from a frame of the game's own renderer (Q7).
// No image generator is used.
//
//   npm run build && node tools/make-card.mjs [seed] [step]
//
// Writes public/hero.webp (1600×900) and checks that it is 16:9 and under 1 MB.
// Run `npm run build` again afterwards so that dist/ carries the image.

import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const seed = /^[A-Za-z0-9-]{1,24}$/.test(process.argv[2] ?? "") ? process.argv[2] : "2328";
const step = Number(process.argv[3] ?? 5400);
const WIDTH = 1600;
const HEIGHT = 900;
const port = 8900 + Math.floor(Math.random() * 90);
const work = mkdtempSync(join(tmpdir(), "backbone-card-"));
const png = join(work, "frame.png");
const out = join(root, "public", "hero.webp");

const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", join(root, "dist")], { stdio: "ignore" });
try {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/?test=1&autostart=1&bot=1&hud=0&seed=${seed}`);
  await page.waitForFunction(() => typeof window.__backbone === "object" && window.__backbone.scene().width > 0);
  // Bring the run to the chosen step and let two frames draw. The run is not paused: a
  // paused game shows its inspector and utilization numbers, which belong to play, not to the art.
  await page.evaluate((target) => window.__backbone.advance(Math.max(0, target - window.__backbone.state().step)), step);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))));
  const state = await page.evaluate(() => window.__backbone.state());
  await page.screenshot({ path: png });
  await browser.close();

  const header = readFileSync(png);
  const width = header.readUInt32BE(16);
  const height = header.readUInt32BE(20);
  if (width * 9 !== height * 16) throw new Error(`the frame is ${width}×${height}, not 16:9`);
  const converted = spawnSync("cwebp", ["-quiet", "-q", "84", png, "-o", out], { stdio: "inherit" });
  if (converted.status !== 0) throw new Error("cwebp failed");
  const bytes = statSync(out).size;
  if (bytes >= 1_000_000) throw new Error(`public/hero.webp is ${bytes} bytes; it must be under 1 MB`);
  console.log(
    JSON.stringify({ out: "public/hero.webp", width, height, bytes, seed, step: state.step, renderer: state.renderer, score: state.score, paused: state.paused }),
  );
} finally {
  server.kill();
  rmSync(work, { recursive: true, force: true });
}
