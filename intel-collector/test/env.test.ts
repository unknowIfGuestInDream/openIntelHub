import { test } from 'node:test';
import assert from 'node:assert/strict';
import { envOrDefault, firstEnvOrDefault } from '../src/utils/env.ts';
import { withEnv } from './helpers.ts';

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
