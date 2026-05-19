import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coerceText, resolvePublishedAt } from '../src/adapters/rss.ts';

test('coerceText returns plain strings as-is', () => {
  assert.equal(coerceText('hello'), 'hello');
});

test('coerceText flattens xml2js {_, $} objects to their text', () => {
  // rss-parser surfaces elements like `<title type="text">Hello</title>` as
  // `{ _: 'Hello', $: { type: 'text' } }`. Such values used to be persisted
  // verbatim to news.json and crashed Next.js prerender with
  // "Objects are not valid as a React child (found: object with keys {_, $})".
  assert.equal(coerceText({ _: 'Hello', $: { type: 'text' } }), 'Hello');
});

test('coerceText resolves Atom-style link objects via href', () => {
  assert.equal(
    coerceText({ $: { href: 'https://example.com/a', rel: 'alternate' } }),
    'https://example.com/a',
  );
});

test('coerceText picks the first usable string out of arrays', () => {
  assert.equal(coerceText([{ $: {} }, { _: 'second' }, 'third']), 'second');
});

test('coerceText returns undefined for unsupported shapes', () => {
  assert.equal(coerceText(undefined), undefined);
  assert.equal(coerceText(null), undefined);
  assert.equal(coerceText({}), undefined);
  assert.equal(coerceText({ foo: 'bar' }), undefined);
});

test('resolvePublishedAt prefers isoDate when available', () => {
  assert.equal(
    resolvePublishedAt({ isoDate: '2026-05-19T12:34:56.000Z', pubDate: 'ignored' }),
    '2026-05-19T12:34:56.000Z',
  );
});

test('resolvePublishedAt falls back to pubDate when isoDate is missing', () => {
  assert.equal(
    resolvePublishedAt({ pubDate: 'Tue, 19 May 2026 12:34:56 GMT' }),
    'Tue, 19 May 2026 12:34:56 GMT',
  );
});

test('resolvePublishedAt falls back to the Unix epoch (not "now") for undated items', () => {
  // Feeds like news.cn omit a parseable pubDate. Using `new Date()` here would
  // stamp every undated item with the collection time, sweeping the
  // publishedAt-desc tiebreak and flooding the homepage's "today" filter.
  // The epoch keeps such items in the dataset but sinks them to the bottom.
  assert.equal(resolvePublishedAt({}), '1970-01-01T00:00:00.000Z');
});
