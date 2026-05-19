import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pipelineOptionsFromEnv } from '../src/config/options.ts';
import { selectLlmItemIds } from '../src/pipeline.ts';
import { articleId, normalizeUrl } from '../src/utils/hash.ts';
import type { MediaSource, RawArticle } from '../src/types.ts';

const TEST_SOURCE: MediaSource = {
  domain: 'example.com',
  nameCN: '示例',
  country: 'Example',
  flag: '🌐',
  accessibleInChina: true,
  language: 'en',
  feeds: ['https://example.com/rss.xml'],
};

test('pipelineOptionsFromEnv ignores unset and blank values', () => {
  assert.deepEqual(
    pipelineOptionsFromEnv({
      COLLECT_MAX_PER_SOURCE: '',
      COLLECT_FETCH_CONCURRENCY: '   ',
    }),
    {},
  );
});

test('pipelineOptionsFromEnv parses valid numeric limits', () => {
  assert.deepEqual(
    pipelineOptionsFromEnv({
      COLLECT_MAX_PER_SOURCE: '5',
      COLLECT_FETCH_CONCURRENCY: '2',
      COLLECT_ANALYZE_CONCURRENCY: '1',
      COLLECT_MAX_LLM_ITEMS: '0',
    }),
    {
      maxPerSource: 5,
      fetchConcurrency: 2,
      analyzeConcurrency: 1,
      maxLlmItems: 0,
    },
  );
});

test('pipelineOptionsFromEnv rejects invalid numeric limits', () => {
  assert.deepEqual(
    pipelineOptionsFromEnv({
      COLLECT_MAX_PER_SOURCE: '0',
      COLLECT_FETCH_CONCURRENCY: '-1',
      COLLECT_ANALYZE_CONCURRENCY: '1.5',
      COLLECT_MAX_LLM_ITEMS: '-1',
    }),
    {},
  );
});

test('selectLlmItemIds picks the newest articles within the LLM item budget', () => {
  const articles: RawArticle[] = [
    article('old', 'https://example.com/old', '2025-01-01T00:00:00.000Z'),
    article('new', 'https://example.com/new', '2025-01-03T00:00:00.000Z'),
    article('mid', 'https://example.com/mid', '2025-01-02T00:00:00.000Z'),
  ];

  const selected = selectLlmItemIds(articles, 2);

  assert.deepEqual(selected, idSet(['https://example.com/new', 'https://example.com/mid']));
  assert.deepEqual(
    selectLlmItemIds(articles, 10),
    idSet(['https://example.com/old', 'https://example.com/new', 'https://example.com/mid']),
  );
  assert.deepEqual(selectLlmItemIds(articles, 0), new Set());
  assert.equal(selectLlmItemIds(articles), null);
});

function article(title: string, url: string, publishedAt: string): RawArticle {
  return {
    source: TEST_SOURCE,
    title,
    url,
    publishedAt,
  };
}

function idSet(urls: string[]): Set<string> {
  return new Set(urls.map((url) => articleId(normalizeUrl(url))));
}
