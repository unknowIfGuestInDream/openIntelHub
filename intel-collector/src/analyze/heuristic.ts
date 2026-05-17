import type { AIAnalysis, Entities, NarrativeBias, RawArticle, Sentiment } from '../types.js';

const POSITIVE = [
  'agree', 'breakthrough', 'cooperate', 'cooperation', 'deal', 'growth', 'peace',
  'progress', 'recover', 'success', 'support', 'win', 'rally', 'surge', 'gain',
];
const NEGATIVE = [
  'attack', 'casualt', 'clash', 'collapse', 'conflict', 'crisis', 'death', 'died',
  'fail', 'fear', 'fire', 'invasion', 'killed', 'loss', 'plunge', 'protest',
  'recession', 'sanction', 'strike', 'tension', 'threat', 'tragedy', 'war',
];
const RISK = [
  'attack', 'bomb', 'casualties', 'cyberattack', 'invasion', 'killed', 'military',
  'missile', 'nuclear', 'sanctions', 'strike', 'terror', 'tension', 'troops', 'war',
];
const MARKET = [
  'bond', 'central bank', 'currency', 'dow', 'earnings', 'economy', 'fed', 'gdp',
  'inflation', 'interest rate', 'market', 'nasdaq', 'oil', 'rate cut', 'recession',
  'stock', 'tariff', 'tax', 'trade', 'yield',
];
const MILITARY = [
  'air force', 'army', 'artillery', 'battalion', 'defense', 'drone', 'general',
  'military', 'missile', 'navy', 'pentagon', 'soldiers', 'tank', 'troops',
];

/**
 * Source → narrative bias mapping. Conservative defaults; refine over time.
 */
const BIAS_BY_DOMAIN: Record<string, NarrativeBias> = {
  'bbc.com': 'center',
  'cbc.ca': 'center-left',
  'abc.net.au': 'center',
  'aljazeera.com': 'center-left',
  'aa.com.tr': 'state',
  'ntv.com.tr': 'center',
  'dw.com': 'center',
  'rfi.fr': 'center',
  'elpais.com': 'center-left',
  'nhk.or.jp': 'center',
  'tass.com': 'state',
  'voanews.com': 'state',
  'news.cn': 'state',
  'chinanews.com': 'state',
  'investing.com': 'center',
  'theguardian.com': 'center-left',
  'nytimes.com': 'center-left',
  'cnn.com': 'center-left',
  'washingtonpost.com': 'center-left',
  'france24.com': 'center',
  'lemonde.fr': 'center-left',
  'spiegel.de': 'center-left',
  'scmp.com': 'center',
  'timesofindia.indiatimes.com': 'center-right',
  'thehindu.com': 'center-left',
  'yna.co.kr': 'center',
  'straitstimes.com': 'center',
  'jpost.com': 'center-right',
  'g1.globo.com': 'center',
  'sputnikglobe.com': 'state',
  'rt.com': 'state',
  'cgtn.com': 'state',
  'globaltimes.cn': 'state',
};

/**
 * Source → baseline credibility (0–100). Heuristic — used both as a fallback
 * and to seed the LLM analyzer's prior.
 */
const CREDIBILITY_BY_DOMAIN: Record<string, number> = {
  'bbc.com': 88, 'cbc.ca': 84, 'abc.net.au': 82, 'aljazeera.com': 76,
  'dw.com': 84, 'rfi.fr': 82, 'elpais.com': 80, 'nhk.or.jp': 86,
  'aa.com.tr': 72, 'ntv.com.tr': 70, 'tass.com': 60, 'voanews.com': 70,
  'news.cn': 60, 'chinanews.com': 62, 'investing.com': 74,
  'theguardian.com': 84, 'nytimes.com': 86, 'cnn.com': 78,
  'washingtonpost.com': 84, 'france24.com': 80, 'lemonde.fr': 84,
  'spiegel.de': 84, 'scmp.com': 76, 'timesofindia.indiatimes.com': 72,
  'thehindu.com': 80, 'yna.co.kr': 80, 'straitstimes.com': 78,
  'jpost.com': 74, 'g1.globo.com': 76,
  'sputnikglobe.com': 50, 'rt.com': 50, 'cgtn.com': 58, 'globaltimes.cn': 56,
};

function countMatches(haystack: string, needles: string[]): number {
  const lower = haystack.toLowerCase();
  let n = 0;
  for (const k of needles) if (lower.includes(k)) n++;
  return n;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function detectSentiment(text: string): Sentiment {
  const p = countMatches(text, POSITIVE);
  const n = countMatches(text, NEGATIVE);
  if (n > p + 1) return 'negative';
  if (p > n + 1) return 'positive';
  return 'neutral';
}

const PEOPLE_HINTS = ['president', 'minister', 'pm ', 'prime minister', 'ceo', 'chancellor'];

/** Crude entity extraction: capitalized n-grams (works for Latin scripts only). */
function extractEntities(text: string): Entities {
  const tokens = text.match(/\b[A-Z][\p{L}.'-]+(?:\s+[A-Z][\p{L}.'-]+){0,3}\b/gu) ?? [];
  const unique = [...new Set(tokens)].filter((t) => t.length > 2 && t.length < 60);

  const people: string[] = [];
  const orgs: string[] = [];
  const places: string[] = [];
  const lower = text.toLowerCase();

  for (const t of unique) {
    const idx = lower.indexOf(t.toLowerCase());
    const ctx = lower.slice(Math.max(0, idx - 24), idx);
    if (PEOPLE_HINTS.some((h) => ctx.includes(h))) people.push(t);
    else if (/(Corp|Inc|Ltd|Bank|Agency|Authority|Council|Committee|Party|University)$/.test(t)) {
      orgs.push(t);
    } else places.push(t);
  }
  return {
    people: people.slice(0, 8),
    orgs: orgs.slice(0, 8),
    places: places.slice(0, 8),
  };
}

export interface AnalyzeInput {
  title: string;
  summary: string;
  domain: string;
}

/**
 * Deterministic heuristic analyzer. Always available, never makes a network call.
 * Used as a fallback when no LLM provider is configured and as a sanity check
 * to seed LLM prompts.
 */
export function heuristicAnalyze(input: AnalyzeInput): AIAnalysis {
  const text = `${input.title} ${input.summary}`;
  const risk = clamp(countMatches(text, RISK) * 18);
  const military = clamp(countMatches(text, MILITARY) * 20);
  const market = clamp(countMatches(text, MARKET) * 16);
  const sentiment = detectSentiment(text);

  // Importance: combine the various impact scores.
  const importance = clamp(risk * 0.35 + military * 0.25 + market * 0.25 + Math.min(text.length / 25, 40));
  const credibility = CREDIBILITY_BY_DOMAIN[input.domain] ?? 65;
  const geopolitical = clamp(risk * 0.6 + military * 0.4);
  const bias = BIAS_BY_DOMAIN[input.domain] ?? 'center';

  return {
    importanceScore: importance,
    riskScore: risk,
    sentiment,
    credibility,
    geopoliticalImpact: geopolitical,
    marketImpact: market,
    militaryRelevance: military,
    narrativeBias: bias,
  };
}

export function extractEntitiesFor(article: Pick<RawArticle, 'title' | 'description'>): Entities {
  return extractEntities(`${article.title} ${article.description ?? ''}`);
}

export function defaultCategory(article: Pick<RawArticle, 'title' | 'description' | 'categories'>): string {
  if (article.categories && article.categories.length > 0) return article.categories[0];
  const text = `${article.title} ${article.description ?? ''}`.toLowerCase();
  if (/(market|stock|economy|inflation|gdp)/.test(text)) return 'business';
  if (/(war|military|attack|missile|troops)/.test(text)) return 'conflict';
  if (/(election|president|parliament|minister)/.test(text)) return 'politics';
  if (/(climate|environment|carbon)/.test(text)) return 'environment';
  if (/(virus|health|pandemic|vaccine)/.test(text)) return 'health';
  return 'world';
}

export function defaultTags(article: Pick<RawArticle, 'title' | 'description'>): string[] {
  const text = `${article.title} ${article.description ?? ''}`.toLowerCase();
  const tags = new Set<string>();
  for (const w of [...RISK, ...MARKET, ...MILITARY]) {
    if (text.includes(w)) tags.add(w);
  }
  return [...tags].slice(0, 6);
}
