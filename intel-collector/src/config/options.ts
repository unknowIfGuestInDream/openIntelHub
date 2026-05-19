import type { PipelineOptions } from '../pipeline.js';

export function pipelineOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): PipelineOptions {
  return {
    ...intOption(env, 'COLLECT_MAX_PER_SOURCE', 'maxPerSource', 1),
    ...intOption(env, 'COLLECT_FETCH_CONCURRENCY', 'fetchConcurrency', 1),
    ...intOption(env, 'COLLECT_ANALYZE_CONCURRENCY', 'analyzeConcurrency', 1),
    ...intOption(env, 'COLLECT_MAX_LLM_ITEMS', 'maxLlmItems', 0),
  };
}

function intOption<K extends keyof PipelineOptions>(
  env: NodeJS.ProcessEnv,
  envName: string,
  optionName: K,
  min: number,
): Pick<PipelineOptions, K> | Record<string, never> {
  const raw = env[envName]?.trim();
  if (!raw) return {};
  const value = Number(raw);
  // Invalid overrides are deliberately ignored so the pipeline's safe defaults remain active.
  if (!Number.isInteger(value) || value < min) return {};
  return { [optionName]: value } as Pick<PipelineOptions, K>;
}
