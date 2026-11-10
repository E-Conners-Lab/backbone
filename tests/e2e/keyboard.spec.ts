import { expect, test } from "@playwright/test";
import { snap } from "./helpers";

// AC17: a whole core loop with the keyboard only. No mouse or touch call appears in this test.
test("keyboard only: start, lay a link, edit its cost, upgrade, pause, choose a reward", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-1920x1080", "keyboard play is checked at desktop size");
  const active = (): Promise<string> => page.evaluate(() => `${document.activeElement?.id ?? ""}|${document.activeElement?.textContent?.trim() ?? ""}`);
  const tabTo = async (match: (a: string) => boolean): Promise<void> => {
    for (let i = 0; i < 60; i++) { if (match(await active())) return; await page.keyboard.press("Tab"); }
    throw new Error("could not reach the control with Tab");
  };

  await page.goto("/?speed=4");
  await tabTo(a => a.startsWith("seedInput|"));
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("keys-1");
  await page.keyboard.press("Enter");
  await expect(page.locator("#hud")).toBeVisible();

  // Space pauses; the map takes focus with Tab; arrows move between sites; Enter starts and ends a link.
  await tabTo(a => a.startsWith("ov|"));
  await page.keyboard.press("Space");
  await expect(page.locator("#pausedFlag")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.locator("#statusText")).toContainText("Link started");
  for (const key of ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"]) {
    await page.keyboard.press(key);
    await page.keyboard.press("Enter");
    if ((await snap(page)).pending > 0) break;
    await page.keyboard.press("Enter");      // start again from the newly focused site
  }
  expect((await snap(page)).pending).toBe(1);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await snap(page)).links.length).toBe(1);

  // The inspector lists the link as text; its Edit button opens the options with focus in the cost field.
  await page.keyboard.press("i");
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#linkRows tr")).toHaveCount(1);
  await tabTo(a => a.endsWith("|Edit"));
  await page.keyboard.press("Enter");
  await expect(page.locator("#card")).toBeVisible();
  expect(await active()).toMatch(/^costInput\|/);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("25");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).links[0]!.cost).toBe(25);

  await tabTo(a => a.startsWith("cardUpgrade|"));
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).links[0]!.tier).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("#card")).toBeHidden();

  // The inspector's form lays a link without the map.
  const before = (await snap(page)).links.length;
  await tabTo(a => a.startsWith("fromSite|"));
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  await tabTo(a => a.startsWith("layBtn|"));
  await expect(page.locator("#routeText")).not.toHaveText("");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await snap(page)).links.length).toBe(before + 1);

  // Number keys pick tools.
  await page.keyboard.press("Escape");
  await page.keyboard.press("3");
  await expect(page.locator('.tool[data-tool="upgrade"]')).toHaveAttribute("aria-pressed", "true");

  // A reward stops the clock; focus lands on the first choice; Enter takes it.
  await page.evaluate(() => { (window as unknown as { __backbone: any }).__backbone.game.speed = 32; });
  await expect(page.locator("#reward")).toBeVisible({ timeout: 60_000 });
  const fiber = (await snap(page)).fiberKm;
  expect(await active()).toMatch(/^rewardFiber\|/);
  await page.keyboard.press("Enter");
  await expect(page.locator("#reward")).toBeHidden();
  await expect.poll(async () => (await snap(page)).fiberKm).toBe(fiber + 3000);
});
