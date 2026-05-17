import Parser from 'rss-parser';
import type { MediaSource, RawArticle } from '../types.js';
import { httpGet } from '../utils/http.js';
import { logger } from '../logger.js';

const parser = new Parser({ timeout: 15_000 });

/**
 * Coerce an RSS field value into a plain string.
 *
 * `rss-parser` (via `xml2js`) represents elements that carry XML attributes
 * as objects of the form `{ _: 'text', $: { attr: 'value' } }`. If such an
 * object is passed through unchanged it ends up in the JSON output and then
 * crashes React during prerender with:
 *   "Objects are not valid as a React child (found: object with keys {_, $})".
 * Arrays (e.g. multiple `<category>` elements collapsed into one field) are
 * flattened to their first usable string.
 */
export function coerceText(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) {
    for (const el of v) {
      const s = coerceText(el);
      if (s) return s;
    }
    return undefined;
  }
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    // xml2js text-with-attributes shape.
    if (typeof obj._ === 'string') return obj._;
    // Atom <link href="..."/> shape.
    if (typeof obj.href === 'string') return obj.href;
    if (typeof obj.url === 'string') return obj.url;
    // xml2js attributes-only shape: `{ $: { href: '...' } }`.
    if (obj.$ && typeof obj.$ === 'object') {
      const attrs = obj.$ as Record<string, unknown>;
      if (typeof attrs.href === 'string') return attrs.href;
      if (typeof attrs.url === 'string') return attrs.url;
    }
  }
  return undefined;
}

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
        const title = coerceText(item.title);
        const link = coerceText(item.link);
        if (!link || !title) continue;
        const categories = Array.isArray(item.categories)
          ? (item.categories.map(coerceText).filter((c): c is string => !!c))
          : undefined;
        out.push({
          source,
          title: title.trim(),
          url: link,
          publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
          description:
            coerceText(item.contentSnippet) ??
            coerceText(item.content) ??
            coerceText(item.summary),
          content: coerceText(item['content:encoded']),
          categories,
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
