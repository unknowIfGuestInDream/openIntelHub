import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNewsItem } from '../src/pipeline.ts';
import { withEnv } from './helpers.ts';
import type { RawArticle } from '../src/types.ts';

test('buildNewsItem translates non-Chinese text even when analysis uses heuristics', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: '{"titleCN":"测试标题","summaryCN":"测试简介"}',
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;

  const article: RawArticle = {
    source: {
      domain: 'example.com',
      nameCN: '示例媒体',
      country: 'US',
      flag: '🇺🇸',
      accessibleInChina: true,
      language: 'en',
      feeds: ['https://example.com/rss'],
    },
    title: 'Test headline',
    url: 'https://example.com/news/1',
    publishedAt: '2026-05-19T00:00:00.000Z',
    description: 'Test summary',
  };

  try {
    await withEnv(
      {
        TRANSLATE_PROVIDER: 'ollama',
        AI_PROVIDER: undefined,
        OLLAMA_BASE_URL: '',
        OLLAMA_MODEL: '',
        TRANSLATE_MODEL: '',
        OPENAI_API_KEY: undefined,
      },
      async () => {
        const item = await buildNewsItem(article, false);
        assert.equal(item.titleCN, '测试标题');
        assert.equal(item.summaryCN, '测试简介');
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(calls, 1);
});
