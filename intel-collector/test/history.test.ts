import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pruneHistory } from '../src/history.ts';

async function tempDir(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), 'oih-history-'));
}

const DAY = 24 * 60 * 60 * 1000;

test('pruneHistory removes only snapshots older than retentionDays', async () => {
  const dir = await tempDir();
  const now = Date.parse('2025-03-31T12:00:00Z');
  const cases: Array<[string, boolean]> = [
    ['2025-03-31.json', true],   // today — keep
    ['2025-03-15.json', true],   // 16 days old — keep
    ['2025-03-02.json', true],   // 29 days old — keep
    ['2025-03-01.json', false],  // 30 days old — prune (cutoff is strictly less than)
    ['2025-01-15.json', false],  // way old — prune
    ['not-a-date.json', true],   // pattern mismatch — keep
    ['README.md', true],         // unrelated — keep
  ];
  await Promise.all(cases.map(([name]) => fs.writeFile(path.join(dir, name), 'x')));

  const removed = await pruneHistory(dir, 30, now);

  assert.deepEqual(
    removed.sort(),
    ['2025-03-01.json', '2025-01-15.json'].sort(),
  );

  const remaining = (await fs.readdir(dir)).sort();
  const expectedRemaining = cases.filter(([, keep]) => keep).map(([n]) => n).sort();
  assert.deepEqual(remaining, expectedRemaining);

  await fs.rm(dir, { recursive: true, force: true });
});

test('pruneHistory tolerates a missing directory', async () => {
  const dir = path.join(os.tmpdir(), `oih-missing-${Date.now()}`);
  const removed = await pruneHistory(dir, 30);
  assert.deepEqual(removed, []);
});
