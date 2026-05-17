import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveProvider, extractJson } from '../src/analyze/ai.ts';

function withEnv(env: Record<string, string | undefined>, fn: () => void): void {
  const orig: Record<string, string | undefined> = {};
  for (const k of Object.keys(env)) {
    orig[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    fn();
  } finally {
    for (const k of Object.keys(orig)) {
      if (orig[k] === undefined) delete process.env[k];
      else process.env[k] = orig[k];
    }
  }
}

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
