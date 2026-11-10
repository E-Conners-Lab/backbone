// Local high scores (AC23). Stored on this device only. Anything read back from storage is
// treated as untrusted input and validated field by field before use.

export interface ScoreEntry { score: number; seconds: number; seed: string }

const KEY = "backbone.scores.v1";
const MAX = 5;
export const SEED_PATTERN = /^[A-Za-z0-9-]{1,24}$/;

const isEntry = (e: unknown): e is ScoreEntry => {
  if (typeof e !== "object" || e === null) return false;
  const r = e as Record<string, unknown>;
  return Number.isSafeInteger(r.score) && (r.score as number) >= 0 && Number.isSafeInteger(r.seconds) && (r.seconds as number) >= 0
    && typeof r.seed === "string" && SEED_PATTERN.test(r.seed);
};

export function loadScores(): ScoreEntry[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter(isEntry).map(e => ({ score: e.score, seconds: e.seconds, seed: e.seed })).sort(order).slice(0, MAX) : [];
  } catch { return []; }
}

/** R12: sorted by score, then by time survived. Returns the new table. */
export function saveScore(entry: ScoreEntry): ScoreEntry[] {
  const table = [...loadScores(), entry].sort(order).slice(0, MAX);
  try { localStorage.setItem(KEY, JSON.stringify(table)); } catch { /* storage unavailable: scores last for this session only */ }
  return table;
}

const order = (a: ScoreEntry, b: ScoreEntry): number => b.score - a.score || b.seconds - a.seconds;
export const formatTime = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
