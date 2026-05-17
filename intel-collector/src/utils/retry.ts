import { logger } from '../logger.js';

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
}

/**
 * Retry an async operation with exponential backoff + jitter.
 *
 * Rethrows the last error if all attempts fail.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelay = opts.baseDelayMs ?? 500;
  const maxDelay = opts.maxDelayMs ?? 5_000;
  const label = opts.label ?? 'op';

  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const delay = Math.min(maxDelay, baseDelay * 2 ** i) + Math.floor(Math.random() * 200);
      logger.warn(
        { err: (err as Error).message, attempt: i + 1, attempts, label },
        'retrying after failure',
      );
      if (i < attempts - 1) await sleep(delay);
    }
  }
  throw lastErr;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
