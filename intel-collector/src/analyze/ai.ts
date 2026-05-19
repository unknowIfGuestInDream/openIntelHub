import type { AIAnalysis } from '../types.js';
import { logger } from '../logger.js';
import { heuristicAnalyze, type AnalyzeInput } from './heuristic.js';
import { withRetry } from '../utils/retry.js';
import { envOrDefault } from '../utils/env.js';

/**
 * Pluggable AI analyzer with three providers, selected by `AI_PROVIDER`:
 *
 *   - `heuristic` (default) — deterministic, zero dependency, no network.
 *   - `ollama`             — local LLM via Ollama (https://ollama.com),
 *                            free / open-source, no API key needed.
 *                            Uses its OpenAI-compatible endpoint.
 *   - `openai`             — any OpenAI-compatible Chat Completions API.
 *
 * For backwards compatibility, setting `OPENAI_API_KEY` alone still
 * activates the `openai` provider.
 *
 * Any failure during an LLM call falls back to the heuristic analyzer so
 * the pipeline always produces output.
 */
export type AIProvider = 'heuristic' | 'ollama' | 'openai';

export function resolveProvider(): AIProvider {
  const explicit = (process.env.AI_PROVIDER ?? '').toLowerCase().trim();
  if (explicit === 'ollama' || explicit === 'openai' || explicit === 'heuristic') {
    return explicit;
  }
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'heuristic';
}

export async function analyze(input: AnalyzeInput): Promise<AIAnalysis> {
  const provider = resolveProvider();
  if (provider === 'heuristic') return heuristicAnalyze(input);
  try {
    return await withRetry(() => callLLM(provider, input), {
      attempts: 2,
      label: `${provider}-analyze`,
    });
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, provider },
      'LLM analyze failed, using heuristic',
    );
    return heuristicAnalyze(input);
  }
}

const SYSTEM_PROMPT = `You are a geopolitical news analyst. For each headline + summary,
respond with a single JSON object using exactly these keys:
importanceScore (0-100), riskScore (0-100), sentiment ("positive"|"neutral"|"negative"),
credibility (0-100), geopoliticalImpact (0-100), marketImpact (0-100),
militaryRelevance (0-100), narrativeBias ("left"|"center-left"|"center"|"center-right"|"right"|"state").
Do not include any text outside the JSON.`;

interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string | null;
}

function providerConfig(provider: 'ollama' | 'openai'): ProviderConfig {
  if (provider === 'ollama') {
    return {
      // Ollama exposes an OpenAI-compatible Chat Completions endpoint at /v1.
      baseUrl: envOrDefault('OLLAMA_BASE_URL', 'http://127.0.0.1:11434/v1'),
      model: envOrDefault('OLLAMA_MODEL', 'llama3.1'),
      apiKey: null,
    };
  }
  return {
    baseUrl: envOrDefault('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
    model: envOrDefault('OPENAI_MODEL', 'gpt-4o-mini'),
    apiKey: process.env.OPENAI_API_KEY?.trim() || null,
  };
}

async function callLLM(
  provider: 'ollama' | 'openai',
  input: AnalyzeInput,
): Promise<AIAnalysis> {
  const cfg = providerConfig(provider);
  if (provider === 'openai' && !cfg.apiKey) {
    throw new Error('OPENAI_API_KEY required for openai provider');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Source domain: ${input.domain}\nTitle: ${input.title}\nSummary: ${input.summary}`,
          },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? '{}';
    const parsed = extractJson(content);
    return mergeWithHeuristic(parsed, input);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Local LLMs sometimes wrap JSON in prose or code fences. Extract the
 * widest balanced `{...}` block, then if that fails to parse, progressively
 * try shorter candidates ending at each `}` from the outside in. This
 * tolerates trailing prose without greedily swallowing unrelated braces.
 */
export function extractJson(content: string): Partial<AIAnalysis> {
  try {
    return JSON.parse(content) as Partial<AIAnalysis>;
  } catch {
    const start = content.indexOf('{');
    if (start < 0) return {};
    // Indices of every '}' at or after the first '{', in left-to-right order.
    const closes: number[] = [];
    for (let i = start; i < content.length; i++) {
      if (content[i] === '}') closes.push(i);
    }
    // Try from the widest span (last '}') down to the narrowest (first '}').
    for (let i = closes.length - 1; i >= 0; i--) {
      const candidate = content.slice(start, closes[i] + 1);
      try {
        return JSON.parse(candidate) as Partial<AIAnalysis>;
      } catch {
        // try next shorter candidate
      }
    }
    return {};
  }
}

function clamp(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function mergeWithHeuristic(p: Partial<AIAnalysis>, input: AnalyzeInput): AIAnalysis {
  const h = heuristicAnalyze(input);
  return {
    importanceScore: clamp(p.importanceScore, h.importanceScore),
    riskScore: clamp(p.riskScore, h.riskScore),
    sentiment: p.sentiment ?? h.sentiment,
    credibility: clamp(p.credibility, h.credibility),
    geopoliticalImpact: clamp(p.geopoliticalImpact, h.geopoliticalImpact),
    marketImpact: clamp(p.marketImpact, h.marketImpact),
    militaryRelevance: clamp(p.militaryRelevance, h.militaryRelevance),
    narrativeBias: p.narrativeBias ?? h.narrativeBias,
  };
}
