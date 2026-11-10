// The reward choice (R10, FR-016). The game is stopped while it is open and the choice has
// no time limit.

import type { Tuning } from "../sim/types";
import { el, km, setText, show } from "./dom";

export class RewardDialog {
  private open = false;

  constructor(tuning: Tuning, choose: (choice: "fiber" | "upgrade") => void) {
    setText(el("reward-fiber"), `+${km(tuning.rewardFiberKm)} of fiber`);
    setText(el("reward-upgrade"), "+1 capacity upgrade");
    el("reward-fiber").addEventListener("click", () => choose("fiber"));
    el("reward-upgrade").addEventListener("click", () => choose("upgrade"));
  }

  /** Shows or hides the dialog to match the world. Focus moves into it when it opens. */
  sync(pending: boolean): void {
    if (pending === this.open) return;
    this.open = pending;
    show(el("reward"), pending);
    if (pending) el("reward-fiber").focus();
    else el("overlay").focus();
  }
}
