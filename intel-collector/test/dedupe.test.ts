import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupe, clusterByTitle } from '../src/dedupe.ts';
import type { NewsItem, RawArticle } from '../src/types.ts';

const src = {
  domain: 'bbc.com', nameCN: 'BBC', country: 'UK', flag: '🇬🇧',
  accessibleInChina: false, language: 'en', feeds: [],
};

test('dedupe collapses tracking-param variants of the same url', () => {
  const articles: RawArticle[] = [
    { source: src, title: 'A', url: 'https://bbc.com/a?utm_source=x', publishedAt: '2025-01-02T00:00:00Z' },
    { source: src, title: 'A', url: 'https://bbc.com/a', publishedAt: '2025-01-01T00:00:00Z' },
    { source: src, title: 'B', url: 'https://bbc.com/b', publishedAt: '2025-01-01T00:00:00Z' },
  ];
  const out = dedupe(articles);
  assert.equal(out.length, 2);
  // The earlier publishedAt should win when collapsing.
  const a = out.find((x) => x.url === 'https://bbc.com/a');
  assert.equal(a?.publishedAt, '2025-01-01T00:00:00Z');
});

test('clusterByTitle groups similar headlines across sources', () => {
  const make = (id: string, title: string, domain: string): NewsItem => ({
    id, title, summary: '', url: `https://${domain}/${id}`,
    source: { domain, nameCN: '', country: '', flag: '' },
    publishedAt: '2025-01-01T00:00:00Z', category: 'world', tags: [],
    entities: { people: [], orgs: [], places: [] },
    ai: {
      importanceScore: 0, riskScore: 0, sentiment: 'neutral',
      credibility: 50, geopoliticalImpact: 0, marketImpact: 0,
      militaryRelevance: 0, narrativeBias: 'center',
    },
    language: 'en',
  });
  const items = [
    make('1', 'Russia launches major missile strike on Kyiv overnight', 'bbc.com'),
    make('2', 'Major Russia missile strike hits Kyiv overnight', 'cnn.com'),
    make('3', 'Tokyo stock market opens higher on Fed signals', 'nhk.or.jp'),
  ];
  const clustered = clusterByTitle(items);
  const c1 = clustered[0].clusterId;
  const c2 = clustered[1].clusterId;
  const c3 = clustered[2].clusterId;
  assert.ok(c1 && c1 === c2, 'similar items should share a clusterId');
  assert.equal(c3, undefined, 'singleton should have no clusterId');
});
