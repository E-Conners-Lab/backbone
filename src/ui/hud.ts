// The HUD and menus are real DOM: real buttons, focus and text, readable by assistive technology
// and large on a projector. Dynamic text is always set with textContent, never as HTML.

import { FAITHFUL, SIMPLIFIED } from "../content/model-notes";
import { capacityOf, dirUtil, isPresent, linkById, linkKm, linkUtil, siteById, totalDropped, worldScore, type Link, type World } from "../sim/world";
import type { Game, Tool } from "./game";
import { formatTime, loadScores, SEED_PATTERN, type ScoreEntry } from "./scores";

const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const e = document.getElementById(id);
  if (!e) throw new Error(`missing element #${id}`);
  return e as T;
};
const setText = (e: HTMLElement, text: string): void => { if (e.textContent !== text) e.textContent = text; };
const show = (e: HTMLElement, on: boolean): void => { if (e.hidden === on) e.hidden = !on; };
const num = (n: number): string => n.toLocaleString("en-US");

export interface HudActions { start(seed: string): void; setReduced(on: boolean): void; reduced(): boolean }

export function randomSeed(): string {
  const a = new Uint16Array(2);
  crypto.getRandomValues(a);
  return `${a[0]!.toString(16).padStart(4, "0")}-${a[1]!.toString(16).padStart(4, "0")}`.toUpperCase();
}

export class Hud {
  inspectorOpen = false;
  private rowsKey = "";
  private sitesKey = "";
  private lastSlow = 0;
  private aboutOpen = false;

  constructor(private game: Game, private actions: HudActions) {
    const g = game;
    el("pauseBtn").addEventListener("click", () => this.togglePause());
    el("inspectBtn").addEventListener("click", () => this.toggleInspector());
    el("inspectClose").addEventListener("click", () => this.toggleInspector(false));
    for (const b of document.querySelectorAll<HTMLButtonElement>(".tool")) b.addEventListener("click", () => this.setTool(b.dataset.tool as Tool));

    el("cardClose").addEventListener("click", () => { g.selectedLink = null; });
    el("costDown").addEventListener("click", () => this.nudgeCost(-1));
    el("costUp").addEventListener("click", () => this.nudgeCost(1));
    const costInput = el<HTMLInputElement>("costInput");
    const commitCost = (): void => {
      if (g.selectedLink === null) return;
      // Number() rather than parseInt: "12abc" must be rejected, not read as 12.
      g.issue({ type: "setCost", link: g.selectedLink, cost: costInput.value.trim() === "" ? NaN : Number(costInput.value) });
    };
    costInput.addEventListener("change", commitCost);
    // Enter only leaves the field: leaving fires "change", which commits once.
    costInput.addEventListener("keydown", e => { if (e.key === "Enter") costInput.blur(); e.stopPropagation(); });
    el("cardUpgrade").addEventListener("click", () => { if (g.selectedLink !== null) g.issue({ type: "upgrade", link: g.selectedLink }); });
    el("cardRemove").addEventListener("click", () => { if (g.selectedLink !== null) { g.issue({ type: "removeLink", link: g.selectedLink }); g.selectedLink = null; } });

    el("layBtn").addEventListener("click", () => {
      const a = Number(el<HTMLSelectElement>("fromSite").value), b = Number(el<HTMLSelectElement>("toSite").value);
      g.issue({ type: "layLink", a, b });
    });
    el("fromSite").addEventListener("change", () => this.updateRoute());
    el("toSite").addEventListener("change", () => this.updateRoute());
    el("clearPending").addEventListener("click", () => g.clearPending());

    el("rewardFiber").addEventListener("click", () => g.issue({ type: "chooseReward", choice: "fiber" }));
    el("rewardUpgrade").addEventListener("click", () => g.issue({ type: "chooseReward", choice: "upgrade" }));
    setText(el("rewardFiberText"), `+${num(g.tuning.rewardFiberKm)} km`);

    const seedInput = el<HTMLInputElement>("seedInput");
    seedInput.value = randomSeed();
    seedInput.addEventListener("keydown", e => { e.stopPropagation(); if (e.key === "Enter") this.startFromInput(); });
    el("seedRandom").addEventListener("click", () => { seedInput.value = randomSeed(); });
    el("startBtn").addEventListener("click", () => this.startFromInput());
    el("againBtn").addEventListener("click", () => actions.start(g.seedText));
    el("newBtn").addEventListener("click", () => { g.mode = "welcome"; g.lapse = null; seedInput.value = randomSeed(); this.showBest(loadScores()); });
    const reduce = el<HTMLInputElement>("reduceMotion");
    reduce.checked = actions.reduced();
    reduce.addEventListener("change", () => actions.setReduced(reduce.checked));
    el("aboutBtn").addEventListener("click", () => { this.aboutOpen = true; this.update(performance.now()); el("aboutClose").focus(); });
    el("aboutClose").addEventListener("click", () => { this.aboutOpen = false; this.update(performance.now()); el("aboutBtn").focus(); });
    for (const [id, items] of [["faithfulList", FAITHFUL], ["simplifiedList", SIMPLIFIED]] as const) {
      const list = el(id);
      for (const text of items) { const li = document.createElement("li"); li.textContent = text; list.appendChild(li); }
    }
    this.showBest(loadScores());
  }

  private startFromInput(): void {
    const input = el<HTMLInputElement>("seedInput");
    const seed = input.value.trim();
    if (!SEED_PATTERN.test(seed)) {
      setText(el("seedHelp"), "That seed will not work. Use 1 to 24 letters, digits or dashes.");
      el("seedHelp").style.color = "var(--amber)";
      input.focus();
      return;
    }
    this.actions.start(seed);
  }

  togglePause(): void {
    const g = this.game;
    if (g.mode !== "play" || g.world.pendingReward) return;
    g.setPaused(!g.paused);
  }
  toggleInspector(open: boolean = !this.inspectorOpen): void { this.inspectorOpen = open; this.rowsKey = ""; }
  setTool(tool: Tool): void {
    this.game.tool = tool;
    for (const b of document.querySelectorAll<HTMLButtonElement>(".tool")) {
      const on = b.dataset.tool === tool;
      b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on));
    }
  }
  closeTop(): boolean {
    if (this.aboutOpen) { this.aboutOpen = false; return true; }
    if (this.game.selectedLink !== null) { this.game.selectedLink = null; return true; }
    if (this.inspectorOpen) { this.inspectorOpen = false; return true; }
    return false;
  }

  /** The link as it will be once pending changes apply, so the card edits the pending value. */
  private effective(id: number): Link | undefined { return linkById(this.game.preview ?? this.game.world, id); }
  private nudgeCost(delta: number): void {
    const g = this.game;
    if (g.selectedLink === null) return;
    const l = this.effective(g.selectedLink);
    if (l) g.issue({ type: "setCost", link: l.id, cost: l.cost + delta });
  }

  private showBest(scores: ScoreEntry[]): void {
    const list = el("bestList");
    list.replaceChildren(...scores.map(s => {
      const li = document.createElement("li");
      li.textContent = `${num(s.score)} delivered · ${formatTime(s.seconds)} · seed ${s.seed}`;
      return li;
    }));
    show(el("noBest"), scores.length === 0);
  }

  private updateRoute(): void {
    const w = this.game.world;
    const a = Number(el<HTMLSelectElement>("fromSite").value), b = Number(el<HTMLSelectElement>("toSite").value);
    const out = el("routeText");
    const sa = siteById(w, a), sb = siteById(w, b);
    if (!sa || !sb || a === b) { setText(out, ""); return; }
    const existing = w.links.some(l => (l.a === a && l.b === b) || (l.a === b && l.b === a));
    const route = w.routes.get(a)?.get(b);
    let text = existing ? "" : `New link: ${num(linkKm(w, a, b))} km of fiber. `;
    if (!route) text += `No path from ${sa.code} to ${sb.code}.`;
    else {
      const hops = [sa.code];
      for (let at = a, guard = 0; at !== b && guard < 40; guard++) {
        const next = w.routes.get(at)?.get(b)?.nextHops[0];
        if (next === undefined) break;
        hops.push(siteById(w, next)?.code ?? "?"); at = next;
      }
      text += `Lowest-cost path now: ${hops.join(" → ")}, cost ${route.cost}.`;
    }
    setText(out, text);
  }

  private linkState(w: World, l: Link): [string, string] {
    if (!l.up) return ["CUT ✕", "cut"];
    const u = linkUtil(w, l);
    if (u >= w.tuning.congestionAt) return ["CONGESTED ▲", "hot"];
    return [u >= 0.6 ? "busy" : "ok", ""];
  }

  private updateInspector(w: World): void {
    const g = this.game;
    // The seed is part of the key: site and link ids repeat from run to run but name different cities.
    const key = `${g.seedText}:${w.links.map(l => l.id).join(",")}`;
    const body = el("linkRows");
    if (key !== this.rowsKey) {
      this.rowsKey = key;
      body.replaceChildren(...w.links.map(l => {
        const tr = document.createElement("tr");
        tr.dataset.link = String(l.id);
        for (let i = 0; i < 6; i++) tr.appendChild(document.createElement(i === 0 ? "th" : "td"));
        (tr.firstChild as HTMLElement).setAttribute("scope", "row");
        const td = document.createElement("td"), b = document.createElement("button");
        b.className = "act"; b.textContent = "Edit";
        b.setAttribute("aria-label", `Edit link ${g.linkName(l)}`);
        b.addEventListener("click", () => {
          g.selectedLink = l.id;
          // Show the options now rather than on the next frame: a hidden field cannot take focus.
          this.update(performance.now());
          el("costInput").focus();
        });
        td.appendChild(b); tr.appendChild(td);
        return tr;
      }));
      show(el("noLinks"), w.links.length === 0);
    }
    for (const tr of body.children as HTMLCollectionOf<HTMLElement>) {
      const l = linkById(w, Number(tr.dataset.link));
      if (!l) continue;
      const c = tr.children as HTMLCollectionOf<HTMLElement>;
      const eff = this.effective(l.id);
      const [state, cls] = this.linkState(w, l);
      setText(c[0]!, g.linkName(l));
      setText(c[1]!, !eff ? "removing" : eff.cost !== l.cost ? `${l.cost}→${eff.cost}` : String(l.cost));
      setText(c[2]!, `${capacityOf(w, l)}/s`);
      setText(c[3]!, `${Math.round(dirUtil(w, l, 0) * 100)}% / ${Math.round(dirUtil(w, l, 1) * 100)}%`);
      setText(c[4]!, state); c[4]!.className = cls;
      setText(c[5]!, String(l.dirs[0].dropped + l.dirs[1].dropped));
      tr.classList.toggle("sel", g.selectedLink === l.id);
    }

    const sites = w.sites.filter(s => isPresent(w, s));
    const sitesKey = `${g.seedText}:${sites.map(s => s.id).join(",")}`;
    if (sitesKey !== this.sitesKey) {
      this.sitesKey = sitesKey;
      for (const [id, pick] of [["fromSite", 0], ["toSite", 1]] as const) {
        const sel = el<HTMLSelectElement>(id), keep = sel.value;
        sel.replaceChildren(...sites.map(s => { const o = document.createElement("option"); o.value = String(s.id); o.textContent = `${s.code} · ${s.name}`; return o; }));
        sel.value = sites.some(s => String(s.id) === keep) ? keep : String(sites[Math.min(pick, sites.length - 1)]?.id ?? "");
      }
    }
    this.updateRoute();
    show(el("pendingRow"), g.pending.length > 0);
    setText(el("pendingText"), `${g.pending.length} change${g.pending.length === 1 ? "" : "s"} pending. They apply together when you resume.`);
  }

  update(now: number): void {
    const g = this.game, w = g.world, t = w.tuning;
    const playing = g.mode === "play";
    show(el("hud"), g.mode !== "welcome");
    el("hud").classList.toggle("is-over", g.mode === "over");
    show(el("welcome"), g.mode === "welcome" && !this.aboutOpen);
    show(el("about"), this.aboutOpen);
    show(el("over"), g.mode === "over");
    const rewardOpen = playing && w.pendingReward !== null && !g.bot;
    const reward = el("reward");
    if (reward.hidden === rewardOpen) { reward.hidden = !rewardOpen; if (rewardOpen) el("rewardFiber").focus(); }
    if (g.mode === "welcome") return;

    // Budget and score reflect pending changes, since those are what the player is deciding on.
    const budget = g.preview ?? w;
    const score = worldScore(w);
    setText(el("seedLabel"), `Endless · seed ${g.seedText}`);
    setText(el("delivered"), num(score.score));
    setText(el("time"), score.time);
    setText(el("fiber"), `${num(budget.fiberKm)} km`);
    setText(el("upgradesLabel"), `${budget.upgrades} available`);
    const drops = Math.min(t.meterMax, Math.floor(w.meterMilli / 1000));
    const meter = el("meter");
    setText(el("meterText"), `${drops > 0 ? "▲ " : ""}${drops} / ${t.meterMax} dropped`);
    el("meterFill").style.width = `${Math.min(100, w.meterMilli / (t.meterMax * 10))}%`;
    meter.setAttribute("aria-valuenow", String(drops));
    meter.classList.toggle("danger", drops >= t.meterMax * 0.7);

    const every = t.rewardEverySec * t.stepsPerSec, left = Math.max(0, w.nextRewardStep - w.step);
    setText(el("rewardTime"), formatTime(Math.ceil(left / t.stepsPerSec)));
    el("rewardRing").style.setProperty("--p", `${Math.round((1 - left / every) * 100)}%`);

    const pauseBtn = el("pauseBtn");
    pauseBtn.setAttribute("aria-pressed", String(g.paused));
    pauseBtn.setAttribute("aria-label", g.paused ? "Resume (space)" : "Pause (space)");
    el("pauseIcon").setAttribute("d", g.paused ? "M2.5 1.2L8.5 5L2.5 8.8z" : "M2 1.2h2.3v7.6H2zM5.7 1.2H8v7.6H5.7z");
    show(el("pausedFlag"), playing && g.paused);
    setText(el("pendingCount"), g.pending.length > 0 ? `· ${g.pending.length} pending` : "");
    el("inspectBtn").setAttribute("aria-pressed", String(this.inspectorOpen));

    const toast = g.toast && g.toast.until > now ? g.toast : null;
    const status = el("status");
    show(status, toast !== null && playing);
    if (toast) {
      setText(el("statusText"), toast.text);
      status.dataset.tone = toast.tone;
      setText(el("statusMark"), toast.tone === "fail" ? "✕" : toast.tone === "warn" ? "!" : "i");
    }

    const card = el("card");
    const sel = playing && g.selectedLink !== null ? linkById(w, g.selectedLink) : undefined;
    show(card, sel !== undefined);
    if (sel) {
      const eff = this.effective(sel.id) ?? sel;
      const u = linkUtil(w, sel), hot = sel.up && u >= t.congestionAt;
      setText(el("cardTitle"), g.linkName(sel));
      const chip = el("cardChip");
      show(chip, hot || !sel.up);
      setText(chip, sel.up ? "▲ CONGESTED" : "✕ CUT");
      chip.classList.toggle("cut", !sel.up);
      card.classList.toggle("hot", hot); card.classList.toggle("cut", !sel.up);
      const input = el<HTMLInputElement>("costInput");
      if (document.activeElement !== input && input.value !== String(eff.cost)) input.value = String(eff.cost);
      setText(el("cardCap"), `${capacityOf(budget, eff)} pkt/s`);
      setText(el("cardUtil"), `${hot ? "▲ " : ""}${Math.round(u * 100)}%`);
      el("cardUtil").style.color = hot ? "var(--amber)" : "";
      setText(el("cardDrops"), String(sel.dirs[0].dropped + sel.dirs[1].dropped));
      const up = el<HTMLButtonElement>("cardUpgrade");
      const maxed = eff.tier >= t.tiers.length - 1;
      up.disabled = maxed || budget.upgrades <= 0;
      setText(up, maxed ? "Max capacity" : budget.upgrades <= 0 ? "No upgrades" : `Upgrade → ${t.tiers[eff.tier + 1]} pkt/s`);
    }

    show(el("inspector"), this.inspectorOpen && playing);
    if (this.inspectorOpen && playing && now - this.lastSlow > 250) { this.lastSlow = now; this.updateInspector(w); }

    if (g.mode === "over") {
      setText(el("overScore"), num(score.score));
      setText(el("overTime"), score.time);
      setText(el("overDrops"), num(totalDropped(w)));
      setText(el("overDetail"), `Lost to full queues: ${w.dropped.queue}. Lost on cut or removed links: ${w.dropped.cut}. No route: ${w.dropped.noroute}.`);
      setText(el("overSeed"), g.seedText);
    }
  }
}
