import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOURCES, getSourceByDomain } from '../src/config/sources.ts';

test('source registry includes at least the 15 outlets from the issue', () => {
  const required = [
    'aa.com.tr', 'abc.net.au', 'aljazeera.com', 'bbc.com', 'cbc.ca',
    'chinanews.com', 'dw.com', 'elpais.com', 'investing.com', 'news.cn',
    'nhk.or.jp', 'ntv.com.tr', 'rfi.fr', 'tass.com', 'voanews.com',
  ];
  const got = new Set(SOURCES.map((s) => s.domain));
  for (const d of required) assert.ok(got.has(d), `missing required source ${d}`);
  // We've added more outlets on top of the original 15.
  assert.ok(SOURCES.length >= 15, `expected >= 15 sources, got ${SOURCES.length}`);
});

test('every source has at least one feed url and required metadata', () => {
  for (const s of SOURCES) {
    assert.ok(s.feeds.length > 0, `${s.domain} must have feeds`);
    assert.ok(s.nameCN.length > 0, `${s.domain} must have nameCN`);
    assert.ok(s.flag.length > 0, `${s.domain} must have flag`);
    assert.equal(typeof s.accessibleInChina, 'boolean');
  }
});

test('getSourceByDomain returns the matching entry', () => {
  assert.equal(getSourceByDomain('bbc.com')?.country, 'UK');
  assert.equal(getSourceByDomain('unknown.example'), undefined);
});
