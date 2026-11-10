// Fails if the committed dist/ differs from a fresh build of the current source (PLAN D1).
// Usage: npm run verify:dist
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const walk = dir => readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const digest = dir => new Map(walk(dir).map(p => [relative(dir, p), createHash("sha256").update(readFileSync(p)).digest("hex")]));

const fresh = mkdtempSync(join(tmpdir(), "backbone-dist-"));
try {
  execFileSync("npx", ["vite", "build", "--outDir", fresh, "--emptyOutDir", "--logLevel", "error"], { stdio: "inherit" });
  const want = digest(fresh), have = digest("dist");
  const problems = [];
  for (const [f, h] of want) if (have.get(f) !== h) problems.push(have.has(f) ? `differs: ${f}` : `missing from dist: ${f}`);
  for (const f of have.keys()) if (!want.has(f)) problems.push(`extra in dist: ${f}`);
  if (problems.length) { console.error(`dist/ does not match a fresh build:\n  ${problems.join("\n  ")}\nRun: npm run build`); process.exit(1); }
  console.log(`dist/ matches a fresh build (${want.size} files).`);
} finally { rmSync(fresh, { recursive: true, force: true }); }
