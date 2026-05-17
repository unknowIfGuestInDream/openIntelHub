import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { CollectionResult } from './types';

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
