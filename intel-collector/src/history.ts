import { promises as fs } from 'node:fs';
import path from 'node:path';

/** Keep this many days of historical daily snapshots on disk. */
export const HISTORY_RETENTION_DAYS = 30;

/**
 * Remove daily snapshot files in `dir` whose date (encoded in the file name as
 * `<YYYY-MM-DD>.json`) is older than `retentionDays` days from `now`.
 *
 * Files that don't match the expected pattern are left untouched. Missing
 * directories are treated as empty. Returns the list of removed file names
 * (useful for logging).
 */
export async function pruneHistory(
  dir: string,
  retentionDays: number,
  now: number = Date.now(),
): Promise<string[]> {
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  const removed: string[] = [];
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return removed;
  }
  for (const name of entries) {
    const m = /^(\d{4}-\d{2}-\d{2})\.json$/.exec(name);
    if (!m) continue;
    const t = Date.parse(`${m[1]}T00:00:00Z`);
    if (Number.isFinite(t) && t < cutoff) {
      await fs.rm(path.join(dir, name), { force: true });
      removed.push(name);
    }
  }
  return removed;
}
