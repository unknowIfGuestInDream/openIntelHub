import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProvider, extractJson, analyze } from '../src/analyze/ai.ts';
import { withEnv } from './helpers.ts';

test('resolveProvider defaults to heuristic with no env', () => {
  withEnv({ AI_PROVIDER: undefined, OPENAI_API_KEY: undefined }, () => {
    assert.equal(resolveProvider(), 'heuristic');
  });
});

test('resolveProvider picks openai when only OPENAI_API_KEY is set', () => {
  withEnv({ AI_PROVIDER: undefined, OPENAI_API_KEY: 'sk-test' }, () => {
    assert.equal(resolveProvider(), 'openai');
  });
});

test('resolveProvider honours explicit AI_PROVIDER=ollama (no key needed)', () => {
  withEnv({ AI_PROVIDER: 'ollama', OPENAI_API_KEY: undefined }, () => {
    assert.equal(resolveProvider(), 'ollama');
  });
});

test('resolveProvider honours explicit AI_PROVIDER=heuristic over a stale key', () => {
  withEnv({ AI_PROVIDER: 'heuristic', OPENAI_API_KEY: 'sk-test' }, () => {
    assert.equal(resolveProvider(), 'heuristic');
  });
});

test('extractJson parses clean JSON', () => {
  const r = extractJson('{"riskScore": 42, "sentiment": "neutral"}');
  assert.equal(r.riskScore, 42);
  assert.equal(r.sentiment, 'neutral');
});

test('extractJson strips surrounding prose / code fences', () => {
  const r = extractJson('Sure! Here is the result:\n```json\n{"riskScore": 7}\n```\nLet me know if you need more.');
  assert.equal(r.riskScore, 7);
});

test('extractJson recovers from trailing garbage that contains stray braces', () => {
  // Greedy "{.*}" would have swallowed the unrelated brace and failed.
  const r = extractJson('{"riskScore": 5} // note: this is }not} part of json');
  assert.equal(r.riskScore, 5);
});

test('extractJson returns empty object when no JSON present', () => {
  assert.deepEqual(extractJson('the model refused to reply'), {});
});

test('analyze uses Ollama defaults when workflow env vars are blank', async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = '';
  let capturedModel = '';
  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input);
    const body = JSON.parse(String(init?.body)) as { model?: string };
    capturedModel = body.model ?? '';
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"importanceScore":77,"riskScore":42}' } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }) as typeof fetch;
  try {
    await withEnv(
      { AI_PROVIDER: 'ollama', OLLAMA_BASE_URL: '', OLLAMA_MODEL: '', OPENAI_API_KEY: undefined },
      async () => {
        const r = await analyze({ title: 'Hello', summary: 'World', domain: 'example.com' });
        assert.equal(r.importanceScore, 77);
        assert.equal(r.riskScore, 42);
      },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(capturedUrl, 'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(capturedModel, 'llama3.1');
});
