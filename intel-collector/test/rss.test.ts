import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coerceText } from '../src/adapters/rss.ts';

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
