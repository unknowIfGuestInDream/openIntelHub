import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envOrDefault, firstEnvOrDefault } from '../src/utils/env.ts';

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

test('envOrDefault falls back for missing or blank values', () => {
  withEnv({ TEST_ENV_OR_DEFAULT: undefined }, () => {
    assert.equal(envOrDefault('TEST_ENV_OR_DEFAULT', 'fallback'), 'fallback');
  });
  withEnv({ TEST_ENV_OR_DEFAULT: '' }, () => {
    assert.equal(envOrDefault('TEST_ENV_OR_DEFAULT', 'fallback'), 'fallback');
  });
  withEnv({ TEST_ENV_OR_DEFAULT: '   ' }, () => {
    assert.equal(envOrDefault('TEST_ENV_OR_DEFAULT', 'fallback'), 'fallback');
  });
});

test('envOrDefault returns trimmed configured values', () => {
  withEnv({ TEST_ENV_OR_DEFAULT: '  configured  ' }, () => {
    assert.equal(envOrDefault('TEST_ENV_OR_DEFAULT', 'fallback'), 'configured');
  });
});

test('firstEnvOrDefault returns the first non-blank configured value', () => {
  withEnv({ TEST_FIRST_ENV_A: '', TEST_FIRST_ENV_B: ' second ', TEST_FIRST_ENV_C: 'third' }, () => {
    assert.equal(
      firstEnvOrDefault(['TEST_FIRST_ENV_A', 'TEST_FIRST_ENV_B', 'TEST_FIRST_ENV_C'], 'fallback'),
      'second',
    );
  });
});

test('firstEnvOrDefault falls back when every candidate is unset or blank', () => {
  withEnv({ TEST_FIRST_ENV_A: undefined, TEST_FIRST_ENV_B: ' ' }, () => {
    assert.equal(firstEnvOrDefault(['TEST_FIRST_ENV_A', 'TEST_FIRST_ENV_B'], 'fallback'), 'fallback');
  });
});
