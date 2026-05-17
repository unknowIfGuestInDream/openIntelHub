import { promises as fs } from 'node:fs';
import path from 'node:path';
import { runPipeline } from './pipeline.js';
import { logger } from './logger.js';

/**
 * CLI entry. Runs the pipeline and writes the JSON to:
 *   - intel-collector/output/news.json    (authoritative artifact)
 *   - ../IntelligenceHub/public/data/news.json   (consumed by the site)
 */
async function main(): Promise<void> {
  const result = await runPipeline();

  const outDir = path.resolve(process.cwd(), 'output');
  await fs.mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, 'news.json');
  await fs.writeFile(outFile, JSON.stringify(result, null, 2), 'utf8');
  logger.info({ outFile, items: result.totalArticles }, 'wrote collector output');

  const siteDir = path.resolve(process.cwd(), '..', 'IntelligenceHub', 'public', 'data');
  try {
    await fs.mkdir(siteDir, { recursive: true });
    await fs.writeFile(path.join(siteDir, 'news.json'), JSON.stringify(result), 'utf8');
    logger.info({ siteDir }, 'mirrored output to site');
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'failed to mirror output to site');
  }
}

main().catch((err) => {
  logger.error({ err: err instanceof Error ? err.stack : err }, 'pipeline failed');
  process.exit(1);
});
