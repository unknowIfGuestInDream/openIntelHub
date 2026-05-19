import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CollectionResult, NewsItem } from './types';

const EMPTY: CollectionResult = {
  generatedAt: new Date(0).toISOString(),
  totalArticles: 0,
  totalSources: 0,
  items: [],
  clusters: [],
};

function dataDir(): string {
  return path.join(process.cwd(), 'public', 'data');
}

/**
 * Read the collector output from `public/data/news.json`.
 *
 * If the file does not exist (first run, no data yet), an empty
 * `CollectionResult` is returned so the site still builds.
 */
export async function loadNews(): Promise<CollectionResult> {
  const file = path.join(dataDir(), 'news.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as CollectionResult;
  } catch {
    return EMPTY;
  }
}

/**
 * List the available historical snapshot dates (YYYY-MM-DD), newest first.
 *
 * Snapshots live in `public/data/history/<date>.json` and are produced by the
 * collector — see `intel-collector/src/index.ts`. Missing directory yields [].
 */
export async function loadHistoryDates(): Promise<string[]> {
  const dir = path.join(dataDir(), 'history');
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .map((f) => f.replace(/\.json$/, ''))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

/**
 * Load a historical snapshot for a specific date. Returns null when no
 * snapshot is available for that date.
 */
export async function loadNewsForDate(date: string): Promise<CollectionResult | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const file = path.join(dataDir(), 'history', `${date}.json`);
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as CollectionResult;
  } catch {
    return null;
  }
}

/**
 * Return current snapshot together with every available historical snapshot
 * (newest history first). The current snapshot is always included first so
 * lookups prefer the freshest data when the same article appears multiple
 * times across snapshots.
 *
 * Used by routes that must remain reachable for articles that were once
 * collected but have since rotated out of the current `news.json`, e.g.
 * `/news/[id]/` linked from older history pages. Without this, those links
 * would 404 because `generateStaticParams` would only see current ids.
 */
export async function loadAllSnapshots(): Promise<CollectionResult[]> {
  const snapshots: CollectionResult[] = [];
  const current = await loadNews();
  if (current.items.length > 0) snapshots.push(current);
  const dates = await loadHistoryDates();
  for (const d of dates) {
    const data = await loadNewsForDate(d);
    if (data) snapshots.push(data);
  }
  return snapshots;
}

/**
 * Collect every unique article id known across the current snapshot and all
 * historical snapshots. Order is deterministic (current first, then history
 * newest → oldest, preserving each snapshot's own order) so static export
 * output is stable across builds.
 */
export async function listAllItemIds(): Promise<string[]> {
  const snapshots = await loadAllSnapshots();
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const s of snapshots) {
    for (const i of s.items) {
      if (seen.has(i.id)) continue;
      seen.add(i.id);
      ids.push(i.id);
    }
  }
  return ids;
}

/**
 * Look up an article by id across current + historical snapshots. Returns the
 * matching item and the snapshot it was found in (so callers can also surface
 * related cluster items from that same snapshot).
 *
 * The current snapshot is searched first to ensure the freshest analysis is
 * preferred when the same id is present in multiple snapshots.
 */
export async function findItemById(
  id: string,
): Promise<{ item: NewsItem; snapshot: CollectionResult } | null> {
  const snapshots = await loadAllSnapshots();
  for (const snapshot of snapshots) {
    const item = snapshot.items.find((i) => i.id === id);
    if (item) return { item, snapshot };
  }
  return null;
}
