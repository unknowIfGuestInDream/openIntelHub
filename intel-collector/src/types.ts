/**
 * Shared type definitions for the news intelligence pipeline.
 */

export interface MediaSource {
  /** Domain identifier, e.g. "bbc.com" */
  domain: string;
  /** Chinese display name */
  nameCN: string;
  /** Country of origin */
  country: string;
  /** Country flag emoji */
  flag: string;
  /** Whether the site is reachable from mainland China without VPN */
  accessibleInChina: boolean;
  /** Primary content language (ISO 639-1) */
  language: string;
  /** One or more RSS / Atom feed URLs */
  feeds: string[];
}

export interface RawArticle {
  source: MediaSource;
  title: string;
  url: string;
  publishedAt: string;
  /** Raw description / summary from the feed, may contain HTML */
  description?: string;
  /** Optional pre-fetched full content */
  content?: string;
  categories?: string[];
}

export type Sentiment = 'positive' | 'neutral' | 'negative';

export type NarrativeBias =
  | 'left'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'right'
  | 'state';

export interface AIAnalysis {
  importanceScore: number;
  riskScore: number;
  sentiment: Sentiment;
  credibility: number;
  geopoliticalImpact: number;
  marketImpact: number;
  militaryRelevance: number;
  narrativeBias: NarrativeBias;
}

export interface Entities {
  people: string[];
  orgs: string[];
  places: string[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  /** Simplified-Chinese translation of `title`, present when the source is
   * non-Chinese and a translation provider is configured. */
  titleCN?: string;
  /** Simplified-Chinese translation of `summary`, present under the same
   * conditions as `titleCN`. */
  summaryCN?: string;
  url: string;
  source: Pick<MediaSource, 'domain' | 'nameCN' | 'country' | 'flag'>;
  publishedAt: string;
  category: string;
  tags: string[];
  entities: Entities;
  ai: AIAnalysis;
  language: string;
  clusterId?: string;
}

export interface CollectionResult {
  generatedAt: string;
  totalArticles: number;
  totalSources: number;
  items: NewsItem[];
  clusters: { id: string; size: number; titles: string[] }[];
}
