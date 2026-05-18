import { logger } from '../logger.js';
import { withRetry } from '../utils/retry.js';

/**
 * Pluggable text translator. Mirrors the analyzer's provider model so the
 * pipeline can render foreign news titles / summaries in Simplified Chinese
 * without any paid service:
 *
 *   - `none`     (default) — disabled, return null and let the UI show the
 *                            original text. No network, zero dependency.
 *   - `ollama`             — local LLM via Ollama (https://ollama.com),
 *                            free / open-source, runs entirely offline.
 *   - `openai`             — any OpenAI-compatible Chat Completions API.
 *
 * When the env var `TRANSLATE_PROVIDER` is unset, we follow `AI_PROVIDER`
 * so a single switch enables both analysis and translation. Any failure
 * during an LLM call falls back to `null`; the caller keeps the original.
 */
export type TranslateProvider = 'none' | 'ollama' | 'openai';

export function resolveTranslateProvider(): TranslateProvider {
  const explicit = (process.env.TRANSLATE_PROVIDER ?? '').toLowerCase().trim();
  if (explicit === 'none' || explicit === 'ollama' || explicit === 'openai') {
    return explicit;
  }
  // Inherit from the analyzer when not explicitly set, so enabling Ollama /
  // OpenAI for analysis also enables Chinese translation by default.
  const inherited = (process.env.AI_PROVIDER ?? '').toLowerCase().trim();
  if (inherited === 'ollama' || inherited === 'openai') return inherited;
  if (process.env.OPENAI_API_KEY) return 'openai';
  return 'none';
}

export interface TranslateInput {
  title: string;
  summary: string;
  /** ISO 639-1 source language code, e.g. `en`, `ja`. */
  sourceLang: string;
}

export interface Translation {
  titleCN: string;
  summaryCN: string;
}

/**
 * Translate a (title, summary) pair into Simplified Chinese. Returns `null`
 * when no provider is configured, when the source is already Chinese, or
 * when all retries fail — the pipeline then keeps the original strings.
 */
export async function translateToChinese(input: TranslateInput): Promise<Translation | null> {
  if (isChinese(input.sourceLang)) return null;
  const provider = resolveTranslateProvider();
  if (provider === 'none') return null;
  try {
    return await withRetry(() => callTranslateLLM(provider, input), {
      attempts: 2,
      label: `${provider}-translate`,
    });
  } catch (err) {
    logger.warn(
      { err: (err as Error).message, provider },
      'LLM translate failed, keeping original text',
    );
    return null;
  }
}

function isChinese(lang: string): boolean {
  const l = (lang ?? '').toLowerCase();
  return l === 'zh' || l.startsWith('zh-') || l === 'cmn' || l.startsWith('cmn-');
}

const SYSTEM_PROMPT = `You are a professional news translator. Translate the
provided news headline and summary into Simplified Chinese (简体中文). Respond
with a single JSON object using exactly these keys:
  titleCN   — the translated headline
  summaryCN — the translated summary
Preserve proper nouns (people, organisations, places) using their conventional
Chinese names when available, otherwise transliterate. Keep the translation
faithful, concise, and free of any commentary. Do not include any text outside
the JSON.`;

interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string | null;
}

function providerConfig(provider: 'ollama' | 'openai'): ProviderConfig {
  if (provider === 'ollama') {
    return {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434/v1',
      model: process.env.TRANSLATE_MODEL ?? process.env.OLLAMA_MODEL ?? 'llama3.1',
      apiKey: null,
    };
  }
  return {
    baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.TRANSLATE_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    apiKey: process.env.OPENAI_API_KEY ?? null,
  };
}

async function callTranslateLLM(
  provider: 'ollama' | 'openai',
  input: TranslateInput,
): Promise<Translation> {
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
            content: `Source language: ${input.sourceLang}\nTitle: ${input.title}\nSummary: ${input.summary}`,
          },
        ],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? '{}';
    const parsed = extractTranslation(content);
    if (!parsed) throw new Error('translation response missing required fields');
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Parse a translation JSON payload. Mirrors the resilient extractor in
 * `analyze/ai.ts`: tolerates code fences and trailing prose by trying every
 * balanced `{...}` slice from widest to narrowest.
 */
export function extractTranslation(content: string): Translation | null {
  const candidates: string[] = [];
  candidates.push(content);
  const start = content.indexOf('{');
  if (start >= 0) {
    for (let i = content.length - 1; i >= start; i--) {
      if (content[i] === '}') candidates.push(content.slice(start, i + 1));
    }
  }
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c) as Partial<Translation>;
      const titleCN = typeof obj.titleCN === 'string' ? obj.titleCN.trim() : '';
      const summaryCN = typeof obj.summaryCN === 'string' ? obj.summaryCN.trim() : '';
      if (titleCN) {
        return { titleCN, summaryCN: summaryCN || titleCN };
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}
