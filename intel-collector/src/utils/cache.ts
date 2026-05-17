import { promises as fs } from 'node:fs';
import path from 'node:path';
import { sha1 } from './hash.js';

const CACHE_DIR = path.resolve(process.cwd(), '.cache', 'http');

async function ensureDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

function cachePath(url: string): string {
  return path.join(CACHE_DIR, `${sha1(url)}.txt`);
}

/** Returns a cached body if it exists and is younger than `ttlMs`. */
export async function readCache(url: string, ttlMs: number): Promise<string | null> {
  try {
    const file = cachePath(url);
    const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > ttlMs) return null;
    return await fs.readFile(file, 'utf8');
  } catch {
    return null;
  }
}

export async function writeCache(url: string, body: string): Promise<void> {
  await ensureDir();
  await fs.writeFile(cachePath(url), body, 'utf8');
}
