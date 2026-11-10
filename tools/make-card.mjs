// Renders the hero art / Arcade card image with the game's own renderer (SPEC Q7).
// Plays a seeded bot run to chosen moments, hides the HUD, and saves PNG candidates.
// Usage: node tools/make-card.mjs <outDir> <seed> <simSeconds,simSeconds,...>
// Needs dist/ served at http://127.0.0.1:4173.
import { chromium } from "@playwright/test";
const [outDir, seed = "ospf", times = "200,260,300"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:4173/?seed=${seed}&bot=1&speed=16&hero=1`);
for (const t of times.split(",").map(Number)) {
  await page.waitForFunction(sec => { const g = window.__backbone.game; return g.world.step >= sec * 20 || g.world.over; }, t, { timeout: 120000 });
  const info = await page.evaluate(() => { const g = window.__backbone.game; g.speed = 1; const w = g.world;
    return { step: w.step, over: w.over, links: w.links.length, cut: w.links.filter(l => !l.up).length }; });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${outDir}/hero-${seed}-${t}.png` });
  console.log(`hero-${seed}-${t}.png`, JSON.stringify(info));
  await page.evaluate(() => { window.__backbone.game.speed = 16; });
}
await browser.close();
