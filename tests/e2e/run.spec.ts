import { expect, test } from "@playwright/test";
import { REGION_NA } from "../../src/content/region-na";
import { replay, type LoggedCommand } from "../../src/sim/replay";
import { DEFAULT_TUNING } from "../../src/sim/world";
import { drag, exportRun, pinch, setBot, snap, tap } from "./helpers";

test("a full seeded run: lay links by hand, pause, tune a cost, then play to game over", async ({ page, hasTouch }) => {
  const touch = !!hasTouch;
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(String(e)));

  // AC1: welcome first, with the one-card briefing.
  await page.goto("/");
  await expect(page.locator("#welcome")).toBeVisible();
  await expect(page.locator(".brief")).toContainText("lowest total cost");
  await expect(page.locator("#hud")).toBeHidden();

  // AC21: a typed seed starts the run and is shown.
  await page.fill("#seedInput", "e2e-1");
  if (touch) await page.tap("#startBtn"); else await page.click("#startBtn");
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("#seedLabel")).toHaveText("Endless · seed e2e-1");
  let s = await snap(page);
  expect(s.sites).toHaveLength(3);

  // AC12: pause (space on desktop, the pause control on the phone).
  if (touch) await page.tap("#pauseBtn"); else await page.keyboard.press("Space");
  await expect(page.locator("#pausedFlag")).toBeVisible();
  const frozenStep = (await snap(page)).step;

  // AC2, AC15/16: drag between sites to lay links. AC14: while paused they are pending.
  const [a, b, c] = s.sites as [typeof s.sites[0], typeof s.sites[0], typeof s.sites[0]];
  await drag(page, touch, a, b);
  await drag(page, touch, b, c);
  s = await snap(page);
  expect(s.pending).toBe(2);
  expect(s.links).toHaveLength(0);
  expect(s.step).toBe(frozenStep);
  await expect(page.locator("#pendingCount")).toContainText("2 pending");

  // AC5: a duplicate is refused with a text reason and nothing is queued.
  await drag(page, touch, a, b);
  await expect(page.locator("#statusText")).toHaveText("Those two sites are already linked.");
  expect((await snap(page)).pending).toBe(2);

  // Resume: both pending changes apply together, and fiber is spent.
  const fiberBefore = s.fiberKm;
  if (touch) await page.tap("#pauseBtn"); else await page.keyboard.press("Space");
  await expect.poll(async () => (await snap(page)).links.length).toBe(2);
  s = await snap(page);
  expect(s.fiberKm).toBeLessThan(fiberBefore);
  expect(s.step).toBeGreaterThan(frozenStep);

  // AC15/16: tap a link to open its options; change the cost; an invalid cost is refused (case 10).
  const link = s.links[0]!;
  await tap(page, touch, s.linkMids.find(m => m.id === link.id)!);
  await expect(page.locator("#card")).toBeVisible();
  await expect(page.locator("#cardTitle")).toHaveText(`${link.a}–${link.b}`);
  if (touch) await page.tap("#costUp"); else await page.click("#costUp");
  await expect.poll(async () => (await snap(page)).links[0]!.cost).toBe(11);
  await page.fill("#costInput", "0");
  await page.keyboard.press("Enter");
  await expect(page.locator("#statusText")).toHaveText("Cost must be a whole number from 1 to 65535.");
  expect((await snap(page)).links[0]!.cost).toBe(11);
  await page.fill("#costInput", "7");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).links[0]!.cost).toBe(7);

  // One edit made while paused is exactly one pending change, applied on resume (AC14).
  if (touch) await page.tap("#pauseBtn"); else await page.keyboard.press("Space");
  await page.fill("#costInput", "9");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).pending).toBe(1);
  await page.fill("#costInput", "9");
  await page.keyboard.press("Enter");
  expect((await snap(page)).pending).toBe(1);
  expect((await snap(page)).links[0]!.cost).toBe(7);
  if (touch) await page.tap("#pauseBtn"); else await page.keyboard.press("Space");
  await expect.poll(async () => (await snap(page)).links[0]!.cost).toBe(9);

  // AC8: an upgrade raises the tier and leaves the cost alone.
  if (touch) await page.tap("#cardUpgrade"); else await page.click("#cardUpgrade");
  await expect.poll(async () => (await snap(page)).links[0]!.tier).toBe(1);
  expect((await snap(page)).links[0]!.cost).toBe(9);
  if (touch) await page.tap("#cardClose"); else await page.keyboard.press("Escape");
  await expect(page.locator("#card")).toBeHidden();

  // Zoom: pinch on the phone, wheel on desktop. Site positions on screen must move apart.
  const spread = (x: Awaited<ReturnType<typeof snap>>): number => Math.hypot(x.sites[0]!.x - x.sites[1]!.x, x.sites[0]!.y - x.sites[1]!.y);
  const before = spread(await snap(page));
  const vp = page.viewportSize()!;
  if (touch) { const cdp = await page.context().newCDPSession(page); await pinch(cdp, vp.width / 2, vp.height / 2, 40, 110); await cdp.detach(); }
  else { await page.mouse.move(vp.width / 2, vp.height / 2); await page.mouse.wheel(0, -400); }
  await expect.poll(async () => spread(await snap(page))).toBeGreaterThan(before * 1.2);

  // AC18: no green or red in the rendered frame.
  const census = await page.evaluate(() => (window as unknown as { __backbone: { hueCensus(): Promise<{ colored: number; green: number; red: number }> } }).__backbone.hueCensus());
  expect(census.colored).toBeGreaterThan(200);
  expect(census.green / census.colored).toBeLessThan(0.01);
  expect(census.red / census.colored).toBeLessThan(0.01);

  // Hand over to the scripted player at high speed and play to game over (AC11).
  await setBot(page, true, 32);
  await expect.poll(async () => (await snap(page)).mode, { timeout: 200_000, intervals: [1000] }).toBe("over");
  await expect(page.locator("#over")).toBeVisible();
  const run = await exportRun(page);
  expect(run.delivered).toBeGreaterThan(100);
  await expect(page.locator("#overScore")).toHaveText(run.delivered.toLocaleString("en-US"));
  await expect(page.locator("#overSeed")).toHaveText("e2e-1");

  // AC22 / R13: the same seed and inputs, re-simulated outside the browser, give the same score.
  const again = replay({ seedText: run.seed, regionId: "na", log: run.log as LoggedCommand[], finalStep: run.finalStep }, REGION_NA, DEFAULT_TUNING);
  expect(again.delivered).toBe(run.delivered);
  expect(again.over).toBe(true);

  // R14: the time-lapse is running on the map.
  const l1 = (await snap(page)).lapseStep;
  await page.waitForTimeout(600);
  const l2 = (await snap(page)).lapseStep;
  expect(l1).not.toBeNull();
  expect(l2).not.toBe(l1);

  // AC23: the score is stored on the device and listed on the welcome screen.
  if (touch) await page.tap("#newBtn"); else await page.click("#newBtn");
  await expect(page.locator("#welcome")).toBeVisible();
  await expect(page.locator("#bestList li").first()).toContainText(`${run.delivered.toLocaleString("en-US")} delivered`);
  await expect(page.locator("#bestList li").first()).toContainText("seed e2e-1");


  // A new run with another seed: the inspector must list the new run's cities, not the old ones.
  await page.fill("#seedInput", "e2e-2");
  if (touch) await page.tap("#startBtn"); else await page.click("#startBtn");
  await expect(page.locator("#links, #hud")).toBeVisible();
  if (touch) await page.tap("#inspectBtn"); else await page.click("#inspectBtn");
  const fresh = await snap(page);
  await expect(page.locator("#fromSite option")).toHaveCount(fresh.sites.length);
  const listed = await page.locator("#fromSite option").allTextContents();
  expect(listed.map(t => t.split(" ")[0]).sort()).toEqual(fresh.sites.map(x => x.code).sort());

  expect(errors).toEqual([]);
});

test("reduced motion keeps every piece of information (AC19)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?seed=calm&bot=1&speed=16");
  await expect.poll(async () => (await snap(page)).delivered, { timeout: 60_000 }).toBeGreaterThan(50);
  const s = await snap(page);
  expect(s.reduced).toBe(true);
  const labels = await page.evaluate(() => (window as unknown as { __backbone: any }).__backbone.scene.labels.map((l: any) => l.kind));
  expect(labels).toContain("site");
  expect(labels).toContain("pill");
});

test("without WebGL the game plays in the 2D renderer (AC20)", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
      return type.startsWith("webgl") ? null : (original as (...a: unknown[]) => unknown).call(this, type, ...rest);
    } as typeof original;
  });
  await page.goto("/?seed=flat&bot=1&speed=16");
  await expect.poll(async () => (await snap(page)).delivered, { timeout: 60_000 }).toBeGreaterThan(50);
  expect((await snap(page)).renderer).toBe("canvas2d");
  const census = await page.evaluate(() => (window as unknown as { __backbone: { hueCensus(): Promise<{ colored: number; green: number; red: number }> } }).__backbone.hueCensus());
  expect(census.colored).toBeGreaterThan(200);
  expect(census.green / census.colored).toBeLessThan(0.01);
});

test("the default renderer is WebGL2 where it is available", async ({ page }) => {
  await page.goto("/?seed=glow&bot=1&speed=4");
  await expect.poll(async () => (await snap(page)).mode).toBe("play");
  expect((await snap(page)).renderer).toBe("webgl2");
});
