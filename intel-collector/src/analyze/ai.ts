import type { AIAnalysis } from '../types.js';
import { logger } from '../logger.js';
import { heuristicAnalyze, type AnalyzeInput } from './heuristic.js';
import { withRetry } from '../utils/retry.js';

/**
 * Pluggable AI analyzer.
 *
 * If `OPENAI_API_KEY` is set, requests are sent to a Chat-Completions
 * compatible endpoint and the JSON reply is parsed into an `AIAnalysis`.
 * Any failure (missing key, network, parse) falls back to the deterministic
 * heuristic analyzer so the pipeline always produces output.
 */
export async function analyze(input: AnalyzeInput): Promise<AIAnalysis> {
  if (!process.env.OPENAI_API_KEY) return heuristicAnalyze(input);
  try {
    return await withRetry(() => callLLM(input), { attempts: 2, label: 'llm-analyze' });
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'LLM analyze failed, using heuristic');
    return heuristicAnalyze(input);
  }
}

const SYSTEM_PROMPT = `You are a geopolitical news analyst. For each headline + summary,
respond with a single JSON object using exactly these keys:
importanceScore (0-100), riskScore (0-100), sentiment ("positive"|"neutral"|"negative"),
credibility (0-100), geopoliticalImpact (0-100), marketImpact (0-100),
militaryRelevance (0-100), narrativeBias ("left"|"center-left"|"center"|"center-right"|"right"|"state").
Do not include any text outside the JSON.`;

async function callLLM(input: AnalyzeInput): Promise<AIAnalysis> {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  const baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1';
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
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
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as Partial<AIAnalysis>;
    return mergeWithHeuristic(parsed, input);
  } finally {
    clearTimeout(timeout);
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
