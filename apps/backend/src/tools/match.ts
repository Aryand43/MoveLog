import { norm } from "../db/queries.js";

/**
 * Token-overlap similarity in [0,1]. Deliberately crude: transcripts are noisy
 * and the cost of a wrong survey match is only an extra photo request.
 */
export function similarity(a: string, b: string): number {
  const ta = new Set(norm(a).split(" ").filter(Boolean));
  const tb = new Set(norm(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;

  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared += 1;
    // Give partial credit for "glass"/"glasses" style near-misses.
    else if ([...tb].some((u) => u.startsWith(t) || t.startsWith(u))) shared += 0.5;
  }
  return shared / Math.max(ta.size, tb.size);
}

export function bestMatch<T>(
  query: string,
  candidates: T[],
  key: (c: T) => string,
): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;
  for (const c of candidates) {
    const score = similarity(query, key(c));
    if (!best || score > best.score) best = { item: c, score };
  }
  return best;
}
