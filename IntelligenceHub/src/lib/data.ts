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

/**
 * Read the collector output from `public/data/news.json`.
 *
 * If the file does not exist (first run, no data yet), an empty
 * `CollectionResult` is returned so the site still builds.
 */
export async function loadNews(): Promise<CollectionResult> {
  const file = path.join(process.cwd(), 'public', 'data', 'news.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as CollectionResult;
  } catch {
    return EMPTY;
  }
}
