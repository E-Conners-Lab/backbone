// Tuning aid: plays the scripted bot on several seeds and prints how each run went.
// Run with: npx vite-node tools/bot-runs.ts   (not part of the game)
import { REGION_NA } from "../src/content/region-na";
import { botCommands } from "../src/sim/bot";
import { createWorld, step, worldScore, DEFAULT_TUNING } from "../src/sim/world";

for (const seed of ["stage-1", "stage-2", "autocon", "ospf", "2328", "denver", "fiber", "noc"]) {
  const w = createWorld(seed, REGION_NA, DEFAULT_TUNING);
  while (!w.over && w.step < 20 * 60 * 40) step(w, botCommands(w));
  const s = worldScore(w);
  console.log(seed.padEnd(8), "time", s.time.padStart(5), "delivered", String(s.score).padStart(5), "dropped", JSON.stringify(w.dropped),
    "links", w.links.length, "fiber", w.fiberKm, "upg", w.upgrades);
}
