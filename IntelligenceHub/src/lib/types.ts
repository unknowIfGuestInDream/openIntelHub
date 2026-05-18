// Mirror of the JSON shape produced by intel-collector.
// Keep in sync with `intel-collector/src/types.ts`.

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

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  titleCN?: string;
  summaryCN?: string;
  url: string;
  source: { domain: string; nameCN: string; country: string; flag: string };
  publishedAt: string;
  category: string;
  tags: string[];
  entities: { people: string[]; orgs: string[]; places: string[] };
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
