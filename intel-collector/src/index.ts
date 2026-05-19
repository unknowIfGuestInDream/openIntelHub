import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runPipeline } from './pipeline.js';
import { logger } from './logger.js';
import { HISTORY_RETENTION_DAYS, pruneHistory } from './history.js';
import { pipelineOptionsFromEnv } from './config/options.js';

/**
 * CLI entry. Runs the pipeline and writes the JSON to:
 *   - intel-collector/output/news.json                       (authoritative artifact)
 *   - ../IntelligenceHub/public/data/news.json               (latest snapshot, consumed by the site)
 *   - ../IntelligenceHub/public/data/history/<YYYY-MM-DD>.json (daily snapshot, last 30 days)
 */
async function main(): Promise<void> {
  const result = await runPipeline(pipelineOptionsFromEnv());

  const outDir = path.resolve(process.cwd(), 'output');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'news.json');
  await fs.writeFile(outFile, JSON.stringify(result, null, 2), 'utf8');
  logger.info({ outFile, items: result.totalArticles }, 'wrote collector output');

  const siteDir = path.resolve(process.cwd(), '..', 'IntelligenceHub', 'public', 'data');
  try {
    await fs.mkdir(siteDir, { recursive: true });
    const serialized = JSON.stringify(result);
    await fs.writeFile(path.join(siteDir, 'news.json'), serialized, 'utf8');
    logger.info({ siteDir }, 'mirrored output to site');

    const historyDir = path.join(siteDir, 'history');
    await fs.mkdir(historyDir, { recursive: true });
    const today = result.generatedAt.slice(0, 10); // YYYY-MM-DD
    await fs.writeFile(path.join(historyDir, `${today}.json`), serialized, 'utf8');
    logger.info({ historyDir, date: today }, 'wrote daily history snapshot');

    const pruned = await pruneHistory(historyDir, HISTORY_RETENTION_DAYS);
    if (pruned.length > 0) {
      logger.info({ pruned }, 'pruned old history snapshots');
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'failed to mirror output to site');
  }
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.stack : err }, 'pipeline failed');
  process.exit(1);
});
