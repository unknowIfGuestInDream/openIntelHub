# OpenIntelHub

> AI-powered global news intelligence platform.

OpenIntelHub aggregates publicly available news from 15+ international media outlets, applies AI-driven analysis (importance scoring, sentiment, geopolitical risk, market impact, narrative bias) and renders the results on a static visualization site that is rebuilt and deployed on a schedule via GitHub Actions.

## Architecture

The project is a TypeScript monorepo with two workspaces:

| Workspace | Purpose | Stack |
|-----------|---------|-------|
| [`intel-collector/`](./intel-collector) | Scrapes RSS / HTML, runs AI analysis, deduplicates, clusters events, emits JSON | Node.js, TypeScript, `rss-parser`, `cheerio`, `pino` |
| [`IntelligenceHub/`](./IntelligenceHub) | Static visualization site consuming the collector's JSON | Next.js (static export), TypeScript, TailwindCSS, ECharts |

```
┌──────────────────┐    JSON     ┌────────────────────┐    static    ┌──────────────┐
│ intel-collector  │ ──────────▶ │  IntelligenceHub   │ ───────────▶ │   SSH host   │
│ (Node + AI)      │   data/     │  (Next.js export)  │     out/     │ (your server)│
└──────────────────┘             └────────────────────┘              └──────────────┘
```

## Supported media sources

15 outlets curated for global coverage (see [`intel-collector/src/config/sources.ts`](./intel-collector/src/config/sources.ts)):

🇹🇷 Anadolu · 🇦🇺 ABC · 🇶🇦 Al Jazeera · 🇬🇧 BBC · 🇨🇦 CBC · 🇨🇳 China News · 🇩🇪 DW · 🇪🇸 El País · 🌍 Investing · 🇨🇳 Xinhua · 🇯🇵 NHK · 🇹🇷 NTV · 🇫🇷 RFI · 🇷🇺 TASS · 🇺🇸 VOA

Each source is registered with metadata (`accessibleInChina`, RSS feeds, language) and consumed through a pluggable adapter — adding a new source is a matter of dropping a new entry into the registry.

## Quick start

```bash
# 1. install
npm install

# 2. collect news (writes JSON to intel-collector/output/ and IntelligenceHub/public/data/)
npm run collect

# 3. build & preview the site
npm run site:build
npm run -w IntelligenceHub start
```

### AI provider

The collector ships with a deterministic **heuristic analyzer** so it works out of the box without an API key. To enable LLM-based analysis set:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # optional, default
```

The analyzer interface (`intel-collector/src/analyze/ai.ts`) is provider-agnostic — any chat-completion compatible endpoint works.

## GitHub Actions

| Workflow | Trigger | Job |
|----------|---------|-----|
| [`ci.yml`](.github/workflows/ci.yml) | PR / push | install, lint, typecheck, test |
| [`collect-and-deploy.yml`](.github/workflows/collect-and-deploy.yml) | cron (every 6h) + manual | collect → analyze → build site → SSH deploy via [`easingthemes/ssh-deploy@v6.0.3`](https://github.com/easingthemes/ssh-deploy) |

Required repository secrets for deployment:

- `SSH_PRIVATE_KEY` — deploy key for the target server
- `REMOTE_HOST` — server hostname / IP
- `REMOTE_USER` — SSH user
- `REMOTE_TARGET` — absolute path on the server (e.g. `/var/www/openintelhub`)
- `OPENAI_API_KEY` *(optional)* — enables LLM analysis instead of heuristics

## Output JSON schema

```ts
interface NewsItem {
  id: string;            // sha1(url)
  title: string;
  summary: string;
  url: string;
  source: { domain: string; nameCN: string; country: string; flag: string };
  publishedAt: string;   // ISO-8601
  category: string;
  tags: string[];
  entities: { people: string[]; orgs: string[]; places: string[] };
  ai: {
    importanceScore: number;     // 0–100
    riskScore: number;           // 0–100
    sentiment: 'positive' | 'neutral' | 'negative';
    credibility: number;         // 0–100
    geopoliticalImpact: number;  // 0–100
    marketImpact: number;        // 0–100
    militaryRelevance: number;   // 0–100
    narrativeBias: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'state';
  };
  clusterId?: string;
}
```

## Roadmap

- RAG retrieval & Q&A over the news corpus
- Global event timeline & propagation-chain analysis
- Social-media cross-validation
- Telegram push & email daily digest
- Risk early-warning rules engine

## License

MIT
