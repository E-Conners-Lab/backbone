// The HUD: fiber budget, upgrade stock, drop meter with its number, score, time and seed
// are always visible during a run (FR-030).

import { formatTime } from "../sim/world";
import { el, km, num, setText } from "./dom";
import type { Game } from "./game";

export function updateHud(game: Game): void {
  const world = game.world;
  const planned = game.planned;
  const changed = game.pending.length > 0;
  setText(el("hud-fiber"), changed ? `${km(planned.fiberKm)} after pending` : km(planned.fiberKm));
  setText(el("hud-upgrades"), changed && planned.upgrades !== world.upgrades ? `${planned.upgrades} after pending` : String(planned.upgrades));
  const size = world.tuning.meterSize;
  const meter = el("hud-meter");
  meter.setAttribute("aria-valuemax", String(size));
  meter.setAttribute("aria-valuenow", String(world.meter));
  meter.setAttribute("aria-valuetext", `${world.meter} of ${size} drops`);
  el("hud-meter-fill").style.width = `${(world.meter / size) * 100}%`;
  setText(el("hud-meter-text"), `${world.meter} / ${size}`);
  setText(el("hud-score"), num(world.delivered));
  setText(el("hud-time"), formatTime(world.step, world.tuning.stepsPerSec));
  setText(el("hud-seed"), game.seed);

  const pause = el<HTMLButtonElement>("btn-pause");
  setText(pause, game.paused ? "Resume" : "Pause");
  pause.setAttribute("aria-pressed", String(game.paused));
  pause.disabled = world.over || world.rewardPending;

  for (const button of document.querySelectorAll<HTMLButtonElement>(".tool")) {
    button.setAttribute("aria-pressed", String(button.dataset.tool === game.tool));
  }
}

/** The line under the HUD that says what state the game is in. */
export function updateStatus(game: Game, siteCode: (id: number) => string): void {
  const status = el("status");
  let text = "";
  if (game.linkStart !== null) {
    text = `Link from ${siteCode(game.linkStart)}: choose the far end, or press Escape.`;
  } else if (game.paused) {
    const n = game.pending.length;
    text = n === 0 ? "Paused. Every tool works. Space resumes." : `Paused. ${n} change${n === 1 ? "" : "s"} pending; ${n === 1 ? "it takes" : "they take"} effect together on resume.`;
  }
  setText(status, text);
  status.hidden = text === "";
}
