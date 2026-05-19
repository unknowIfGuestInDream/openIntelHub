import pLimit from 'p-limit';
import { SOURCES } from './config/sources.js';
import { fetchFromSource } from './adapters/rss.js';
import { logger } from './logger.js';
import type { CollectionResult, NewsItem, RawArticle } from './types.js';
import { articleId, normalizeUrl } from './utils/hash.js';
import { makeSummary } from './extract/article.js';
import { clusterByTitle, dedupe } from './dedupe.js';
import { analyze } from './analyze/ai.js';
import { translateToChinese } from './analyze/translate.js';
import {
  defaultCategory,
  defaultTags,
  extractEntitiesFor,
  heuristicAnalyze,
} from './analyze/heuristic.js';

export interface PipelineOptions {
  /** Hard cap on items processed per source (defensive). */
  maxPerSource?: number;
  /** Concurrency for source fetching. */
  fetchConcurrency?: number;
  /** Concurrency for AI analysis. */
  analyzeConcurrency?: number;
  /** Maximum number of articles allowed to call an external LLM for analysis. */
  maxLlmItems?: number;
}

export async function runPipeline(opts: PipelineOptions = {}): Promise<CollectionResult> {
  const fetchConc = opts.fetchConcurrency ?? 4;
  const analyzeConc = opts.analyzeConcurrency ?? 4;
  const maxPerSource = opts.maxPerSource ?? 25;
  const maxLlmItems = opts.maxLlmItems;

  logger.info({ sources: SOURCES.length, fetchConc, analyzeConc, maxLlmItems }, 'starting collection');

  // 1. Fetch in parallel with rate limiting.
  const fetchLimit = pLimit(fetchConc);
  const raw: RawArticle[] = (
    await Promise.all(
      SOURCES.map((src) =>
        fetchLimit(async () => {
          const items = await fetchFromSource(src);
          return items.slice(0, maxPerSource);
        }),
      ),
    )
  ).flat();
  logger.info({ count: raw.length }, 'fetched raw articles');

  // 2. Deduplicate by normalized URL.
  const deduped = dedupe(raw);
  logger.info({ before: raw.length, after: deduped.length }, 'deduped');
  const llmItemIds = selectLlmItemIds(deduped, maxLlmItems);

  // 3. Analyze in parallel.
  const analyzeLimit = pLimit(analyzeConc);
  const items: NewsItem[] = await Promise.all(
    deduped.map((a) =>
      analyzeLimit(() => buildNewsItem(a, shouldUseLlm(a, llmItemIds))),
    ),
  );

  // 4. Cluster cross-source duplicates by title similarity.
  const clustered = clusterByTitle(items);

  // 5. Sort by importance then time desc.
  clustered.sort((a, b) => {
    if (b.ai.importanceScore !== a.ai.importanceScore) {
      return b.ai.importanceScore - a.ai.importanceScore;
    }
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });

  const clusters = summarizeClusters(clustered);

  return {
    generatedAt: new Date().toISOString(),
    totalArticles: clustered.length,
    totalSources: new Set(clustered.map((i) => i.source.domain)).size,
    items: clustered,
    clusters,
  };
}

export function selectLlmItemIds(
  articles: RawArticle[],
  maxLlmItems?: number,
): Set<string> | null {
  if (maxLlmItems === undefined) return null;
  if (maxLlmItems <= 0) return new Set();
  return new Set(
    [...articles]
      .map((article) => {
        const publishedMs = Date.parse(article.publishedAt);
        // Invalid dates share the epoch fallback used for undated RSS items,
        // keeping them behind dated articles when spending the LLM budget.
        return {
          article,
          publishedMs: Number.isFinite(publishedMs) ? publishedMs : 0,
        };
      })
      .sort((a, b) => b.publishedMs - a.publishedMs)
      .slice(0, maxLlmItems)
      .map(({ article }) => articleId(normalizeUrl(article.url))),
  );
}

function shouldUseLlm(article: RawArticle, llmItemIds: Set<string> | null): boolean {
  return llmItemIds === null || llmItemIds.has(articleId(normalizeUrl(article.url)));
}

export async function buildNewsItem(a: RawArticle, useLlm: boolean): Promise<NewsItem> {
  const url = normalizeUrl(a.url);
  const id = articleId(url);
  const summary = makeSummary(a.description ?? a.content ?? a.title);
  const analyzeInput = { title: a.title, summary, domain: a.source.domain };
  // A null translation means the item keeps its original title/summary.
  const translationPromise = translateToChinese({
    title: a.title,
    summary,
    sourceLang: a.source.language,
  });
  const [ai, translation] = await Promise.all([
    useLlm ? analyze(analyzeInput) : Promise.resolve(heuristicAnalyze(analyzeInput)),
    translationPromise,
  ]);

  return {
    id,
    title: a.title,
    summary,
    ...(translation ? { titleCN: translation.titleCN, summaryCN: translation.summaryCN } : {}),
    url,
    source: {
      domain: a.source.domain,
      nameCN: a.source.nameCN,
      country: a.source.country,
      flag: a.source.flag,
    },
    publishedAt: a.publishedAt,
    category: defaultCategory(a),
    tags: defaultTags(a),
    entities: extractEntitiesFor(a),
    ai,
    language: a.source.language,
  };
}

function summarizeClusters(items: NewsItem[]): CollectionResult['clusters'] {
  const map = new Map<string, NewsItem[]>();
  for (const i of items) {
    if (!i.clusterId) continue;
    const arr = map.get(i.clusterId) ?? [];
    arr.push(i);
    map.set(i.clusterId, arr);
  }
  return [...map.entries()].map(([id, arr]) => ({
    id,
    size: arr.length,
    titles: arr.slice(0, 5).map((i) => i.titleCN ?? i.title),
  }));
}
