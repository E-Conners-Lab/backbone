// One run on screen: the world, its command log, the fixed-step loop and pause.
// While time stands still, because the game is paused or a reward is waiting to be chosen,
// changes are checked against a copy of the world, shown as pending, and all sent together
// in the step that starts time again (FR-016, FR-024, AC14). They stay pending, and the
// copy stays in use, until that step has run: there is no moment at which a change is
// neither pending nor applied.

import { botCommands } from "../sim/bot";
import { recordCommands } from "../sim/replay";
import type { Command, LinkId, LogEntry, Reason, Region, SiteId, StepEvents, Tuning, World } from "../sim/types";
import { applyCommand, cloneWorld, createWorld, step, validate } from "../sim/world";
import type { Effect } from "../render/viewmodel";

export type Tool = "link" | "cost" | "upgrade" | "remove";

export interface GameHooks {
  onEvents(events: StepEvents): void;
  onRejected(reason: Reason, command: Command): void;
}

export class Game {
  readonly world: World;
  readonly log: LogEntry[] = [];
  paused = false;
  /** The world as it will be once the pending changes apply. Exists while there are any. */
  projected: World | null = null;
  pending: Command[] = [];
  speed = 1;
  bot = false;
  /** Fraction of the current step already shown. */
  alpha = 0;
  effects: Effect[] = [];
  tool: Tool = "link";
  focusSite: SiteId | null = null;
  focusLink: LinkId | null = null;
  /** The site a link is being started from. */
  linkStart: SiteId | null = null;
  /** The site whose router table the inspector shows. */
  tableSite: SiteId | null = null;
  drag: { from: SiteId; x: number; y: number } | null = null;

  private queue: Command[] = [];
  private carry = 0;

  constructor(
    readonly seed: string,
    region: Region,
    readonly tuning: Tuning,
    private readonly hooks: GameHooks,
  ) {
    this.world = createWorld(seed, region, tuning);
  }

  get stepMs(): number {
    return 1000 / this.tuning.stepsPerSec;
  }

  /** The world the budget and link lists should be read from: with pending changes while time stands still. */
  get planned(): World {
    return this.projected ?? this.world;
  }

  /** Time is standing still for the player: the game is paused, or a reward is waiting to be chosen. */
  get holding(): boolean {
    return this.paused || this.world.rewardPending;
  }

  /**
   * Sends a command. Returns the reason when the rules refuse it, so the caller can say why.
   * While time stands still, or while earlier pending changes have not been applied yet, the
   * command is held as pending; otherwise it applies at the next step.
   */
  issue(command: Command): Reason | null {
    // The reward choice is held like any other change, after the ones made before it, and is
    // what lets the next step run. Checked against the copy, a second choice is refused.
    if (this.holding || this.projected !== null) return this.hold(command);
    const reason = validate(this.world, command);
    if (!reason) this.queue.push(command);
    return reason;
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused || this.world.over || this.world.rewardPending) return;
    this.paused = paused;
    if (!paused) return; // what was held is released by the next step, not here
    // A command sent in the instant before the pause has not reached the simulation yet.
    // It joins the pending changes, so that the copy of the world later changes are checked
    // against already has it, and link IDs given there match the ones given on resume.
    const waiting = this.queue;
    this.queue = [];
    for (const command of waiting) {
      const reason = this.hold(command);
      if (reason) this.hooks.onRejected(reason, command);
    }
  }

  /** Checks a command against the world as it will be, and keeps it as pending if it is allowed. */
  private hold(command: Command): Reason | null {
    this.projected ??= cloneWorld(this.world);
    const reason = applyCommand(this.projected, command);
    if (!reason) this.pending.push(command);
    return reason;
  }

  /** A reward has been chosen and is waiting, with the changes before it, for the next step. */
  get rewardChosen(): boolean {
    return this.pending.some((command) => command.type === "chooseReward");
  }

  /** Advances the simulation by the real time that has passed. Never while paused. */
  tick(elapsedMs: number): void {
    if (this.paused || this.world.over) return;
    if (this.world.rewardPending) {
      // Time stands still until a choice arrives.
      if (this.bot || this.rewardChosen) this.stepOnce();
      this.alpha = 0;
      return;
    }
    this.carry += Math.min(elapsedMs, 250) * this.speed;
    let guard = 0;
    while (this.carry >= this.stepMs && guard++ < 96) {
      this.carry -= this.stepMs;
      this.stepOnce();
      if (this.world.over || this.world.rewardPending) {
        this.carry = 0;
        break;
      }
    }
    this.alpha = this.carry / this.stepMs;
  }

  /** Runs whole steps at once. For tests and tools. Like `tick`, never while paused. */
  advance(steps: number): void {
    if (this.paused) return;
    for (let i = 0; i < steps && !this.world.over; i++) {
      if (this.world.rewardPending && !this.bot && !this.rewardChosen) break;
      this.stepOnce();
    }
  }

  private stepOnce(): void {
    // Everything held goes into this one step, in the order it was made, so there is one
    // route calculation. Only now does the copy of the world stop being the one to read.
    const commands = [...this.queue, ...this.pending, ...(this.bot ? botCommands(this.world) : [])];
    this.queue = [];
    this.pending = [];
    this.projected = null;
    recordCommands(this.log, this.world, commands);
    const events = step(this.world, commands);
    for (const refusal of events.rejected) this.hooks.onRejected(refusal.reason, refusal.command);
    this.hooks.onEvents(events);
  }
}
