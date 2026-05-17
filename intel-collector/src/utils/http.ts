import { readCache, writeCache } from './cache.js';
import { withRetry } from './retry.js';
import { logger } from '../logger.js';

const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (compatible; OpenIntelHubBot/0.1; +https://github.com/unknowIfGuestInDream/openIntelHub)',
  Accept: 'text/html,application/xhtml+xml,application/xml,application/rss+xml;q=0.9,*/*;q=0.8',
};

export interface HttpGetOptions {
  cacheTtlMs?: number;
  timeoutMs?: number;
  attempts?: number;
}

/**
 * GET a URL with retry, timeout, file-system caching and a polite User-Agent.
 * Uses Node 20+ built-in fetch (no extra dependency).
 */
export async function httpGet(url: string, opts: HttpGetOptions = {}): Promise<string> {
  const ttl = opts.cacheTtlMs ?? 15 * 60 * 1000; // 15 minutes
  const timeoutMs = opts.timeoutMs ?? 15_000;

  const cached = await readCache(url, ttl);
  if (cached !== null) {
    logger.debug({ url }, 'http cache hit');
    return cached;
  }

  const body = await withRetry(
    async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers: DEFAULT_HEADERS, signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return await res.text();
      } finally {
        clearTimeout(t);
      }
    },
    { label: `GET ${url}`, attempts: opts.attempts ?? 3 },
  );

  await writeCache(url, body);
  return body;
}
