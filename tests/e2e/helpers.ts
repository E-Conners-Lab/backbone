import type { CDPSession, Page } from "@playwright/test";

export interface Snapshot {
  mode: string; step: number; delivered: number; meterMilli: number; over: boolean; paused: boolean; pending: number;
  links: { id: number; a: string; b: string; cost: number; tier: number; up: boolean }[];
  sites: { id: number; code: string; x: number; y: number }[];
  linkMids: { id: number; x: number; y: number }[];
  fiberKm: number; upgrades: number; renderer: string; reduced: boolean; rewardPending: boolean; toast: string | null;
  lapseStep: number | null; seed: string; logLength: number;
}

/** Reads game state through the read-only test handle. Screen positions come from the live scene. */
export const snap = (page: Page): Promise<Snapshot> => page.evaluate(() => {
  const b = (window as unknown as { __backbone: any }).__backbone, g = b.game, w = g.world, scene = b.scene;
  const code = (id: number): string => w.sites.find((s: any) => s.id === id)?.code ?? "?";
  return {
    mode: g.mode, step: w.step, delivered: w.delivered, meterMilli: w.meterMilli, over: w.over, paused: g.paused, pending: g.pending.length,
    links: w.links.map((l: any) => ({ id: l.id, a: code(l.a), b: code(l.b), cost: l.cost, tier: l.tier, up: l.up })),
    sites: (scene?.sites ?? []).map((s: any) => ({ id: s.id, code: code(s.id), x: s.x, y: s.y })),
    linkMids: (scene?.links ?? []).map((l: any) => ({ id: l.id, x: (l.x0 + l.x1) / 2, y: (l.y0 + l.y1) / 2 })),
    fiberKm: w.fiberKm, upgrades: w.upgrades, renderer: b.renderer, reduced: b.reduced, rewardPending: w.pendingReward !== null,
    toast: g.toast ? g.toast.text : null, lapseStep: g.lapse ? g.lapse.world.step : null, seed: g.seedText, logLength: g.log.length,
  };
});

export const setBot = (page: Page, on: boolean, speed: number): Promise<void> =>
  page.evaluate(([o, s]) => { const g = (window as unknown as { __backbone: any }).__backbone.game; g.bot = o; g.speed = s; }, [on, speed] as const);

export const exportRun = (page: Page): Promise<{ seed: string; log: unknown[]; finalStep: number; delivered: number }> => page.evaluate(() => {
  const g = (window as unknown as { __backbone: any }).__backbone.game;
  return { seed: g.seedText, log: JSON.parse(JSON.stringify(g.log)), finalStep: g.world.step, delivered: g.world.delivered };
});

/** A real drag from one point to another: mouse on desktop, a touch sequence on the phone. */
export async function drag(page: Page, touch: boolean, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const steps = 8;
  if (!touch) {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    for (let i = 1; i <= steps; i++) await page.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
    await page.mouse.up();
    return;
  }
  const cdp = await page.context().newCDPSession(page);
  const point = (x: number, y: number) => [{ x, y, id: 1 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: point(from.x, from.y) });
  for (let i = 1; i <= steps; i++)
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: point(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

export async function tap(page: Page, touch: boolean, at: { x: number; y: number }): Promise<void> {
  if (touch) await page.touchscreen.tap(at.x, at.y); else await page.mouse.click(at.x, at.y);
}

export async function pinch(cdp: CDPSession, cx: number, cy: number, from: number, to: number): Promise<void> {
  const pts = (d: number) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(from) });
  for (let i = 1; i <= 6; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(from + (to - from) * i / 6) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
