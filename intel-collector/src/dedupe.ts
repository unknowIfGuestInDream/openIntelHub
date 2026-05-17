import type { NewsItem, RawArticle } from './types.js';
import { articleId, normalizeUrl } from './utils/hash.js';

/**
 * Deduplicate raw articles by normalized URL, keeping the earliest publishedAt.
 */
export function dedupe(articles: RawArticle[]): RawArticle[] {
  const seen = new Map<string, RawArticle>();
  for (const a of articles) {
    const key = articleId(a.url);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { ...a, url: normalizeUrl(a.url) });
      continue;
    }
    if (new Date(a.publishedAt) < new Date(existing.publishedAt)) {
      seen.set(key, { ...a, url: normalizeUrl(a.url) });
    }
  }
  return [...seen.values()];
}

/**
 * Detect items that share the same story across sources, by computing
 * Jaccard similarity over the set of significant title tokens (>2 chars).
 *
 * Assigns a stable `clusterId` to every item in a cluster of size ≥ 2.
 */
export function clusterByTitle(items: NewsItem[], threshold = 0.45): NewsItem[] {
  const tokensFor = (s: string): Set<string> =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2),
    );

  const tokensCache = items.map((i) => tokensFor(i.title));
  const parent = items.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a: number, b: number): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = tokensCache[i];
      const b = tokensCache[j];
      if (a.size === 0 || b.size === 0) continue;
      let inter = 0;
      for (const t of a) if (b.has(t)) inter++;
      const union_ = a.size + b.size - inter;
      if (inter / union_ >= threshold) union(i, j);
    }
  }

  const buckets = new Map<number, number[]>();
  for (let i = 0; i < items.length; i++) {
    const root = find(i);
    const arr = buckets.get(root) ?? [];
    arr.push(i);
    buckets.set(root, arr);
  }

  return items.map((item, idx) => {
    const root = find(idx);
    const bucket = buckets.get(root) ?? [];
    if (bucket.length < 2) return item;
    return { ...item, clusterId: `c_${articleId(items[root].url)}` };
  });
}
