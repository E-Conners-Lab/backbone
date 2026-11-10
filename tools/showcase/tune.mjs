// Plays the showcase player and the baseline bot headlessly on several seeds and prints how each
// run went, with the fiber cuts it met. Used to tune the player and to pick a seed for the video.
// Usage: node tools/showcase/tune.mjs [--events] [--cap-min N] seed [seed...]
import { loadTs } from "./load.mjs";

const args = process.argv.slice(2);
const showEvents = args.includes("--events");
const capAt = args.indexOf("--cap-min");
const capMin = capAt >= 0 ? Number(args[capAt + 1]) : 40;
const seeds = args.filter((a, i) => !a.startsWith("--") && i !== capAt + 1 || (capAt < 0 && !a.startsWith("--")));

const { modules: [world, region, bot, player], close } = await loadTs("/src/sim/world.ts", "/src/content/region-na.ts", "/src/sim/bot.ts", "/tools/showcase/player.ts");
const { createWorld, step, worldScore, isDark, siteById, DEFAULT_TUNING } = world;
const name = (w, l) => `${siteById(w, l.a).code}-${siteById(w, l.b).code}`;

function play(seed, mode) {
  const w = createWorld(seed, region.REGION_NA, DEFAULT_TUNING);
  const mem = player.newMemory();
  const sps = w.tuning.stepsPerSec;
  const events = [], kinds = {};
  let cuts = 0, darkCuts = 0;
  const t0 = performance.now();
  while (!w.over && w.step < capMin * 60 * sps) {
    let commands = [];
    if (mode === "bot") commands = bot.botCommands(w);
    else if (w.pendingReward || w.step % sps === 0) {
      const move = player.decide(w, mem);
      if (move) { commands = move.commands; kinds[move.kind] = (kinds[move.kind] ?? 0) + 1; events.push(`${stamp(w)} [${move.kind}] ${move.why}`); }
    }
    for (const e of step(w, commands)) {
      if (e.type === "cut") {
        cuts++;
        const dark = w.sites.filter(s => isDark(w, s)).map(s => s.code);
        if (dark.length > 0) darkCuts++;
        events.push(`${stamp(w)} CUT ${name(w, w.links.find(l => l.id === e.link))}${dark.length ? ` -> DARK ${dark.join(",")}` : " -> rerouted"} (meter ${Math.floor(w.meterMilli / 1000)})`);
      } else if (e.type === "restored") events.push(`${stamp(w)} repaired ${name(w, w.links.find(l => l.id === e.link))} (meter ${Math.floor(w.meterMilli / 1000)})`);
      else if (e.type === "reject") events.push(`${stamp(w)} REJECT ${e.reason} ${JSON.stringify(e.command)}`);
    }
  }
  const s = worldScore(w);
  return { seed, mode, time: s.time, seconds: s.seconds, delivered: s.score, dropped: w.dropped, links: w.links.length, cuts, darkCuts, kinds, events, ms: Math.round(performance.now() - t0) };
}
const stamp = w => { const s = Math.floor(w.step / w.tuning.stepsPerSec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

for (const seed of seeds.length ? seeds : ["stage-1", "stage-2", "autocon", "ospf", "2328", "denver", "fiber", "noc"]) {
  const b = play(seed, "bot"), p = play(seed, "player");
  console.log(`${seed.padEnd(10)} bot ${b.time.padStart(5)} delivered ${String(b.delivered).padStart(6)} | player ${p.time.padStart(5)} delivered ${String(p.delivered).padStart(6)} dropped ${JSON.stringify(p.dropped)} links ${p.links} cuts ${p.cuts} (dark ${p.darkCuts}) moves ${JSON.stringify(p.kinds)} [${p.ms} ms]`);
  if (showEvents) for (const e of p.events) console.log("   ", e);
}
await close();
