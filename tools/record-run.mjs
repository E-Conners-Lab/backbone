// Records the final-verification videos: a seeded run from start to game over, at desktop and
// phone sizes, driven by the scripted player. The simulation runs at a multiple of its fixed
// step, so the run is the same run it would be in real time (PLAN: verification).
// Usage: node tools/record-run.mjs <seed> <speed>     (needs dist/ served at http://127.0.0.1:4173 and ffmpeg)
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [seed = "stage-1", speed = "4"] = process.argv.slice(2);
const outDir = "docs/verification";
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const results = [];
for (const [name, width, height, touch] of [["desktop-1920x1080", 1920, 1080, false], ["phone-844x390", 844, 390, true]]) {
  const tmp = mkdtempSync(join(tmpdir(), "backbone-video-"));
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: { width, height } } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.goto("http://127.0.0.1:4173/");
  await page.waitForTimeout(2500);                                   // the welcome screen
  await page.fill("#seedInput", seed);
  await page.waitForTimeout(600);
  await (touch ? page.tap("#startBtn") : page.click("#startBtn"));
  await page.evaluate(s => { const g = window.__backbone.game; g.bot = true; g.speed = s; }, Number(speed));
  await page.waitForFunction(() => window.__backbone.game.mode === "over", null, { timeout: 600000, polling: 500 });
  const result = await page.evaluate(() => { const b = window.__backbone, w = b.game.world;
    return { delivered: w.delivered, dropped: w.dropped, steps: w.step, seconds: Math.floor(w.step / w.tuning.stepsPerSec), links: w.links.length, renderer: b.renderer, commands: b.game.log.length }; });
  await page.waitForTimeout(17000);                                  // score panel and one pass of the time-lapse
  await context.close();
  const webm = join(tmp, readdirSync(tmp).find(f => f.endsWith(".webm")));
  const mp4 = join(outDir, `run-${seed}-${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4]);
  rmSync(tmp, { recursive: true, force: true });
  results.push({ size: name, seed, speed: Number(speed), ...result, video: mp4, videoBytes: statSync(mp4).size, pageErrors: errors });
  console.log(JSON.stringify(results.at(-1)));
}
await browser.close();
writeFileSync(join(outDir, `run-${seed}.json`), JSON.stringify(results, null, 2) + "\n");
