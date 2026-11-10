// Dev aid: screenshots of the built game. Usage: node tools/shot.mjs <outDir> [query] [waitMs]
// Serves nothing itself: start `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` first.
import { chromium } from "@playwright/test";
const [outDir = ".", query = "", waitMs = "3000"] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [name, width, height, touch] of [["desktop", 1920, 1080, false], ["phone", 844, 390, true]]) {
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:4173/${query}`);
  await page.waitForTimeout(Number(waitMs));
  await page.screenshot({ path: `${outDir}/${name}.png` });
  const state = await page.evaluate(() => { const b = window.__backbone; const w = b.game.world;
    return { mode: b.game.mode, step: w.step, delivered: w.delivered, links: w.links.length, meter: w.meterMilli, frameMs: Math.round(b.frameMs() * 10) / 10, renderer: b.renderer }; });
  console.log(name, JSON.stringify(state), errors.length ? "ERRORS: " + errors.join(" | ") : "no page errors");
  await page.close();
}
await browser.close();
