// The game controller: owns the world, the fixed-step clock, pause and the pending-change queue,
// the command log, and the list of visual effects raised by simulation events.
// Player input reaches the world only as commands (PLAN: simulation contract).

import { project } from "../render/camera";
import { botCommands } from "../sim/bot";
import type { LoggedCommand } from "../sim/replay";
import { applyCommand, cloneWorld, createWorld, isActive, isDark, linkById, siteById, step, worldScore,
  type Command, type Link, type Region, type RejectReason, type StepEvent, type Tuning, type World } from "../sim/world";
import { saveScore, type ScoreEntry } from "./scores";

export type Tool = "link" | "cost" | "upgrade";
export type Mode = "welcome" | "play" | "over";
export interface Fx { kind: "cut" | "ripple" | "ping" | "drop"; x: number; y: number; t0: number }
export interface Toast { text: string; tone: "info" | "warn" | "fail"; until: number }

const REJECT_TEXT: Record<RejectReason, string> = {
  "game-over": "The run is over.",
  "unknown-site": "That site is not on the map yet.",
  "same-site": "A link needs two different sites.",
  "duplicate-link": "Those two sites are already linked.",
  "not-enough-fiber": "Not enough fiber for a link that long.",
  "unknown-link": "That link no longer exists.",
  "link-is-cut": "That link is cut. It can be removed once it is repaired.",
  "bad-cost": "Cost must be a whole number from 1 to 65535.",
  "no-upgrades": "No capacity upgrades available. Earn one at the next reward.",
  "max-tier": "That link is already at the highest capacity.",
  "no-reward-pending": "There is no reward to choose right now.",
  "bad-choice": "That reward is not on offer.",
};

export class Game {
  mode: Mode = "welcome";
  world: World;
  seedText = "";
  log: LoggedCommand[] = [];
  paused = false;
  /** Changes queued while paused (AC14). They all apply together on resume. */
  pending: Command[] = [];
  /** The world as it will be once the pending changes apply. Null when nothing is pending. */
  preview: World | null = null;
  private outbox: Command[] = [];
  speed = 1;
  bot = false;
  private acc = 0;
  /** Seconds of play shown so far, including the fraction of the current step. Drives effects. */
  clock = 0;
  /** Fraction of a step elapsed, for smooth pulse motion. */
  alpha = 0;
  fx: Fx[] = [];
  toast: Toast | null = null;
  tool: Tool = "link";
  selectedLink: number | null = null;
  /** linkId -> clock time of the last queue drop, for the "dropping" state. */
  lastDrop = new Map<number, number>();
  sitePos = new Map<number, [number, number]>();
  scores: ScoreEntry[] = [];
  /** Time-lapse (R14): a second world re-simulated from the log, shown after game over. */
  lapse: { world: World; index: number; finalStep: number } | null = null;
  onEvents: (events: StepEvent[]) => void = () => {};

  constructor(readonly region: Region, readonly tuning: Tuning) {
    this.world = createWorld("idle", region, tuning);
    this.indexSites(this.world);
  }

  private indexSites(w: World): void {
    this.sitePos.clear();
    for (const s of w.sites) this.sitePos.set(s.id, project(s.lon, s.lat));
  }

  start(seedText: string): void {
    this.seedText = seedText;
    this.world = createWorld(seedText, this.region, this.tuning);
    this.indexSites(this.world);
    this.log = []; this.pending = []; this.preview = null; this.outbox = [];
    this.acc = 0; this.clock = 0; this.alpha = 0; this.fx = []; this.toast = null;
    this.paused = false; this.selectedLink = null; this.lapse = null; this.lastDrop.clear();
    this.mode = "play";
    for (const s of this.world.sites) if (s.appearStep === 0) this.addFx("ping", s.id);
    this.say("Drag from one site to another to lay fiber.", "info", 6);
  }

  /** The world to draw: the time-lapse world while it plays, otherwise the live one. */
  get view(): World { return this.lapse?.world ?? this.world; }
  get stepMs(): number { return 1000 / this.tuning.stepsPerSec; }

  linkName(l: Pick<Link, "a" | "b">, w: World = this.world): string {
    return `${siteById(w, l.a)?.code ?? "?"}–${siteById(w, l.b)?.code ?? "?"}`;
  }

  say(text: string, tone: Toast["tone"] = "info", seconds = 4): void {
    this.toast = { text, tone, until: performance.now() + seconds * 1000 };
  }

  /** Every player action goes through here. */
  issue(c: Command): void {
    if (this.mode !== "play" || this.world.over) return;
    if (this.paused && c.type !== "chooseReward") {
      const preview = this.preview ?? cloneWorld(this.world);
      const result = applyCommand(preview, c);
      const rejected = result.find(e => e.type === "reject");
      if (rejected && rejected.type === "reject") { this.say(REJECT_TEXT[rejected.reason], "warn"); return; }
      if (result.length === 0) return;      // nothing would change (for example, the same cost again)
      this.preview = preview;
      this.pending.push(c);
      return;
    }
    this.outbox.push(c);
  }

  clearPending(): void { this.pending = []; this.preview = null; }

  setPaused(paused: boolean): void {
    if (this.mode !== "play" || this.paused === paused) return;
    this.paused = paused;
    if (!paused) {
      this.outbox.push(...this.pending);
      this.pending = []; this.preview = null;
    }
  }

  private flush(): void {
    const commands = this.outbox;
    this.outbox = [];
    if (this.bot) commands.push(...botCommands(this.world));
    for (const command of commands) this.log.push({ at: this.world.step, command });
    this.handle(step(this.world, commands));
  }

  tick(dtMs: number): void {
    if (this.mode === "over") { this.tickLapse(dtMs); return; }
    if (this.mode !== "play" || this.paused) return;
    const w = this.world;
    if (w.pendingReward) { if (this.outbox.length > 0 || this.bot) this.flush(); return; }
    this.acc += Math.min(dtMs, 250) * this.speed;
    while (this.acc >= this.stepMs && !w.over && !w.pendingReward) { this.flush(); this.acc -= this.stepMs; }
    if (w.over || w.pendingReward) this.acc = 0;
    this.alpha = this.acc / this.stepMs;
    this.clock = (w.step + this.alpha) / this.tuning.stepsPerSec;
  }

  private addFx(kind: Fx["kind"], site: number): void {
    const p = this.sitePos.get(site);
    if (p) this.fx.push({ kind, x: p[0], y: p[1], t0: this.clock });
  }
  private linkMid(l: Pick<Link, "a" | "b">): [number, number] | undefined {
    const a = this.sitePos.get(l.a), b = this.sitePos.get(l.b);
    return a && b ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] : undefined;
  }

  private handle(events: StepEvent[]): void {
    const w = this.world;
    let drops = 0;
    for (const e of events) {
      switch (e.type) {
        case "reject": this.say(REJECT_TEXT[e.reason], "warn"); break;
        case "cut": {
          const l = linkById(w, e.link);
          const mid = l && this.linkMid(l);
          if (l && mid) {
            this.fx.push({ kind: "cut", x: mid[0], y: mid[1], t0: this.clock });
            const dark = w.sites.filter(s => isDark(w, s)).map(s => s.code);
            this.say(dark.length > 0 ? `${this.linkName(l)} fiber cut. ${dark.join(", ")} dark: no path.`
              : `${this.linkName(l)} fiber cut. Traffic rerouted.`, "fail", 6);
          }
          break;
        }
        case "restored": { const l = linkById(w, e.link); if (l) this.say(`${this.linkName(l)} repaired.`, "info"); break; }
        case "siteAppeared": { this.addFx("ping", e.site); this.say(`New site: ${siteById(w, e.site)?.name ?? ""}. Link it before it starts sending.`, "info", 6); break; }
        case "linkLaid": case "costSet": {
          const l = linkById(w, e.link); const mid = l && this.linkMid(l);
          if (mid) this.fx.push({ kind: "ripple", x: mid[0], y: mid[1], t0: this.clock });
          break;
        }
        case "drop":
          if (e.link !== undefined) this.lastDrop.set(e.link, this.clock);
          if (drops++ < 4) this.addFx("drop", e.at);
          break;
        case "over": this.finish(); break;
        default: break;
      }
    }
    if (this.selectedLink !== null && !linkById(w, this.selectedLink)) this.selectedLink = null;
    this.fx = this.fx.filter(f => this.clock - f.t0 < 4);
    this.onEvents(events);
  }

  private finish(): void {
    const s = worldScore(this.world);
    this.scores = saveScore({ score: s.score, seconds: s.seconds, seed: this.seedText });
    this.mode = "over";
    this.selectedLink = null;
    this.startLapse();
  }

  startLapse(): void {
    this.lapse = { world: createWorld(this.seedText, this.region, this.tuning), index: 0, finalStep: this.world.step };
    this.fx = []; this.lastDrop.clear();
  }

  /** Re-simulates the recorded run at high speed (R14). Loops with a pause at the end. */
  private tickLapse(dtMs: number): void {
    const l = this.lapse;
    if (!l) return;
    const w = l.world;
    if (w.step >= l.finalStep || w.over) {
      this.acc += dtMs;
      if (this.acc > 2500) { this.acc = 0; this.startLapse(); }
      return;
    }
    // The whole run plays back in about 14 seconds.
    const stepsPerFrame = Math.max(1, Math.ceil(l.finalStep / (14 * 60) * (dtMs / 16.7)));
    for (let i = 0; i < stepsPerFrame && w.step < l.finalStep && !w.over; i++) {
      const commands: Command[] = [];
      while (l.index < this.log.length && this.log[l.index]!.at <= w.step) commands.push(this.log[l.index++]!.command);
      for (const e of step(w, commands)) {
        if (e.type !== "cut") continue;
        const link = linkById(w, e.link); const mid = link && this.linkMid(link);
        if (mid) this.fx.push({ kind: "cut", x: mid[0], y: mid[1], t0: w.step / this.tuning.stepsPerSec });
      }
    }
    this.alpha = 0;
    this.clock = w.step / this.tuning.stepsPerSec;
    this.fx = this.fx.filter(f => this.clock - f.t0 < 6);
  }

  /** Sites that are present but still in their grace period. */
  isNew(w: World, id: number): boolean { const s = siteById(w, id); return !!s && !isActive(w, s); }
}
