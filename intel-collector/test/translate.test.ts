import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTranslateProvider,
  extractTranslation,
  translateToChinese,
} from '../src/analyze/translate.ts';
import { withEnv } from './helpers.ts';

test('resolveTranslateProvider defaults to none with no env', () => {
  withEnv(
    { TRANSLATE_PROVIDER: undefined, AI_PROVIDER: undefined, OPENAI_API_KEY: undefined },
    () => {
      assert.equal(resolveTranslateProvider(), 'none');
    },
  );
});

test('resolveTranslateProvider inherits AI_PROVIDER=ollama', () => {
  withEnv(
    { TRANSLATE_PROVIDER: undefined, AI_PROVIDER: 'ollama', OPENAI_API_KEY: undefined },
    () => {
      assert.equal(resolveTranslateProvider(), 'ollama');
    },
  );
});

test('resolveTranslateProvider inherits openai from a stale OPENAI_API_KEY', () => {
  withEnv(
    { TRANSLATE_PROVIDER: undefined, AI_PROVIDER: undefined, OPENAI_API_KEY: 'sk-test' },
    () => {
      assert.equal(resolveTranslateProvider(), 'openai');
    },
  );
});

test('resolveTranslateProvider honours explicit TRANSLATE_PROVIDER=none', () => {
  withEnv(
    { TRANSLATE_PROVIDER: 'none', AI_PROVIDER: 'ollama', OPENAI_API_KEY: 'sk-test' },
    () => {
      assert.equal(resolveTranslateProvider(), 'none');
    },
  );
});

test('resolveTranslateProvider honours explicit TRANSLATE_PROVIDER=ollama', () => {
  withEnv({ TRANSLATE_PROVIDER: 'ollama', AI_PROVIDER: undefined, OPENAI_API_KEY: undefined }, () => {
    assert.equal(resolveTranslateProvider(), 'ollama');
  });
});

test('extractTranslation parses a clean JSON object', () => {
  const r = extractTranslation('{"titleCN":"中国新闻","summaryCN":"摘要内容"}');
  assert.deepEqual(r, { titleCN: '中国新闻', summaryCN: '摘要内容' });
});

test('extractTranslation strips code fences and surrounding prose', () => {
  const r = extractTranslation(
    'Here you go:\n```json\n{"titleCN":"标题","summaryCN":"简介"}\n```\nDone.',
  );
  assert.deepEqual(r, { titleCN: '标题', summaryCN: '简介' });
});

test('extractTranslation falls back to titleCN when summaryCN missing', () => {
  const r = extractTranslation('{"titleCN":"仅标题"}');
  assert.deepEqual(r, { titleCN: '仅标题', summaryCN: '仅标题' });
});

test('extractTranslation returns null when no valid JSON is present', () => {
  assert.equal(extractTranslation('the model refused to reply'), null);
});

test('extractTranslation returns null when titleCN is empty', () => {
  assert.equal(extractTranslation('{"titleCN":"","summaryCN":"x"}'), null);
});

test('translateToChinese returns null for Chinese sources without any call', async () => {
  await withEnv({ TRANSLATE_PROVIDER: 'ollama' }, async () => {
    const r = await translateToChinese({ title: '标题', summary: '摘要', sourceLang: 'zh' });
    assert.equal(r, null);
  });
});

test('translateToChinese returns null when provider is none', async () => {
  await withEnv(
    { TRANSLATE_PROVIDER: 'none', AI_PROVIDER: undefined, OPENAI_API_KEY: undefined },
    async () => {
      const r = await translateToChinese({ title: 'Hello', summary: 'World', sourceLang: 'en' });
      assert.equal(r, null);
    },
  );
});

test('translateToChinese uses Ollama defaults when workflow env vars are blank', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedModel = '';
  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input);
    const body = JSON.parse(String(init?.body)) as { model?: string };
    capturedModel = body.model ?? '';
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"titleCN":"你好","summaryCN":"世界"}' } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;
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
        const r = await translateToChinese({ title: 'Hello', summary: 'World', sourceLang: 'en' });
        assert.deepEqual(r, { titleCN: '你好', summaryCN: '世界' });
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(capturedUrl, 'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(capturedModel, 'llama3.1');
});
