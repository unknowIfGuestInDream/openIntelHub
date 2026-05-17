import Parser from 'rss-parser';
import type { MediaSource, RawArticle } from '../types.js';
import { httpGet } from '../utils/http.js';
import { logger } from '../logger.js';

const parser = new Parser({ timeout: 15_000 });

/**
 * Fetch one source's RSS feeds and normalize the items into RawArticle[].
 *
 * Errors are logged and swallowed per-feed so a single broken feed cannot
 * take down the whole collection run.
 */
export async function fetchFromSource(source: MediaSource): Promise<RawArticle[]> {
  const out: RawArticle[] = [];
  for (const feedUrl of source.feeds) {
    try {
      const xml = await httpGet(feedUrl, { cacheTtlMs: 10 * 60 * 1000 });
      const feed = await parser.parseString(xml);
      for (const item of feed.items) {
        if (!item.link || !item.title) continue;
        out.push({
          source,
          title: item.title.trim(),
          url: item.link,
          publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
          description: item.contentSnippet ?? item.content ?? item.summary,
          content: item['content:encoded'] as string | undefined,
          categories: item.categories,
        });
      }
      logger.info({ source: source.domain, feedUrl, items: feed.items.length }, 'rss fetched');
    } catch (err) {
      logger.error(
        { source: source.domain, feedUrl, err: (err as Error).message },
        'rss fetch failed',
      );
    }
  }
  return out;
}
