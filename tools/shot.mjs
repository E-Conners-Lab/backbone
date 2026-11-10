// Takes a screenshot of the built game, for looking at it during development.
//   node tools/shot.mjs <out.png> <width>x<height> "<query>" [wait ms] [key …]
// Serves dist/ itself on a free port (tools/serve-dist.mjs), so nothing else needs to be running.

import { chromium } from "@playwright/test";
import { serveDist } from "./serve-dist.mjs";

const [out, size = "1920x1080", query = "", wait = "1500", ...keys] = process.argv.slice(2);
if (!out) {
  console.error('usage: node tools/shot.mjs <out.png> <width>x<height> "<query>" [wait ms] [key …]');
  process.exit(2);
}
const [width, height] = size.split("x").map(Number);
const server = await serveDist();
try {
  const browser = await chromium.launch();
  const phone = width < 1000;
  const page = await browser.newPage({ viewport: { width, height }, hasTouch: phone, isMobile: phone });
  const problems = [];
  page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  await page.goto(`${server.url}${query}`);
  await page.waitForTimeout(Number(wait));
  for (const key of keys) {
    await page.keyboard.press(key);
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: out });
  const state = await page.evaluate(() => (window.__backbone ? window.__backbone.state() : null));
  console.log(JSON.stringify({ out, state, problems }));
  await browser.close();
} finally {
  server.stop();
}
