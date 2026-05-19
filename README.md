# OpenIntelHub

> AI 驱动的全球新闻情报平台。

OpenIntelHub 聚合 15+ 国际主流媒体的公开新闻，应用 AI 分析（重要性评分、情感、地缘政治风险、市场影响、叙事偏向），
并以静态可视化站点的形式展示。整套数据由 GitHub Actions 周期性重建并自动部署。

## 架构

本项目是一个 TypeScript Monorepo，包含两个 workspace：

| Workspace | 作用 | 技术栈 |
|-----------|------|--------|
| [`intel-collector/`](./intel-collector) | 抓取 RSS / HTML，运行 AI 分析、去重、事件聚类，输出 JSON | Node.js、TypeScript、`rss-parser`、`cheerio`、`pino` |
| [`IntelligenceHub/`](./IntelligenceHub) | 消费 collector JSON 的静态可视化站点 | Next.js（静态导出）、TypeScript、TailwindCSS、ECharts |

```
┌──────────────────┐    JSON     ┌────────────────────┐    static    ┌──────────────┐
│ intel-collector  │ ──────────▶ │  IntelligenceHub   │ ───────────▶ │   SSH 主机   │
│ (Node + AI)      │   data/     │  (Next.js export)  │     out/     │ (你的服务器) │
└──────────────────┘             └────────────────────┘              └──────────────┘
```

## 支持的媒体源

注册表内置 30+ 全球与垂直媒体（详见 [`intel-collector/src/config/sources.ts`](./intel-collector/src/config/sources.ts)）——
包括 BBC、CNN、NYT、卫报、华盛顿邮报、半岛电视台、法新社、世界报、德国之声、国家报、明镜周刊、NHK、韩联社、印度时报、
印度教徒报、南华早报、海峡时报、耶路撒冷邮报、Globo、阿纳多卢、NTV、TASS、RT、Sputnik、VOA、新华社、中新网、CGTN、
环球时报、Investing.com 等；同时覆盖 **AI 行业**（TechCrunch AI、MIT Technology Review AI、Ars Technica AI、VentureBeat AI、Wired AI）
与 **GitHub 平台**（GitHub Blog、GitHub Changelog、GitHub Engineering Blog）的最新动态。

每个数据源都附带元数据（`accessibleInChina`、RSS feeds、language），通过可插拔的适配器消费——
新增一个源只需在注册表中追加一条记录即可。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 采集新闻（产物写入 intel-collector/output/ 与 IntelligenceHub/public/data/）
npm run collect

# 3. 构建并预览站点
npm run site:build
npm run -w IntelligenceHub start
```

### AI 服务提供方

采集器支持三种分析器，通过 `AI_PROVIDER` 环境变量选择：

| `AI_PROVIDER` | 说明 | 必填环境变量 |
|---|---|---|
| `heuristic` *(默认)* | 基于关键词的确定性评分，不联网、无需 key | — |
| `ollama` | 通过 [Ollama](https://ollama.com) 调用**本地 LLM**——免费开源，跑在自己机器上 | `OLLAMA_BASE_URL` *(默认 `http://127.0.0.1:11434/v1`)*、`OLLAMA_MODEL` *(默认 `llama3.1`)* |
| `openai` | 任何 OpenAI 兼容的 Chat Completions 接口 | `OPENAI_API_KEY`，可选 `OPENAI_BASE_URL`、`OPENAI_MODEL` *(默认 `gpt-4o-mini`)* |

#### 使用 Ollama（无需 API key）

```bash
# 1. 安装 Ollama（https://ollama.com）
ollama pull llama3.1

# 2. 指向本地模型运行采集器
AI_PROVIDER=ollama npm run collect
```

任何 LLM 调用失败（超时、解析错误、非 200 响应）都会自动回退到 heuristic 分析器，整个流水线不会中断。

> **在 GitHub Actions 中启用本地 Ollama**：只需把仓库变量 `AI_PROVIDER` 设为 `ollama`，
> [`collect-and-deploy.yml`](.github/workflows/collect-and-deploy.yml) 会在 GitHub 托管的
> runner 上自动 `curl install` Ollama、后台启动 `ollama serve`，并默认拉取
> CPU 友好的 `llama3.2:1b`（可通过仓库变量 `OLLAMA_MODEL` 覆盖）。
> 整个分析过程完全在 runner 内部完成，不需要任何远程 API key。
> 若你已自托管 Ollama 实例并希望让工作流去远程调用，设置仓库变量
> `OLLAMA_BASE_URL` 即可跳过这一步、改为通过 HTTP 访问你的远端服务。

### 中文翻译（标题与简介）

外文新闻的 `title` / `summary` 可以在采集阶段顺手翻译成简体中文，写入
`titleCN` / `summaryCN` 字段，站点会优先展示中文，原文以小字呈现。
通过 `TRANSLATE_PROVIDER` 环境变量选择翻译提供方：

| `TRANSLATE_PROVIDER` | 说明 | 必填环境变量 |
|---|---|---|
| `none` *(默认)* | 不翻译，站点回退到展示原文 | — |
| `ollama` | 通过本地 **Ollama** 调用免费开源模型（推荐离线方案） | `OLLAMA_BASE_URL`、`OLLAMA_MODEL`，可选 `TRANSLATE_MODEL` 单独覆盖 |
| `openai` | 任何 OpenAI 兼容接口（含 DeepSeek、SiliconFlow、本地 vLLM 等） | `OPENAI_API_KEY`，可选 `OPENAI_BASE_URL` / `OPENAI_MODEL` / `TRANSLATE_MODEL` |

未显式设置 `TRANSLATE_PROVIDER` 时，会自动跟随 `AI_PROVIDER`，因此开启
`AI_PROVIDER=ollama` 即可同时启用分析与翻译，无需重复配置。源语言为
`zh` 的内容会跳过翻译；`COLLECT_MAX_LLM_ITEMS` 只限制 AI 分析数量，
`COLLECT_MAX_TRANSLATE_ITEMS` 单独限制翻译数量（同样按时间倒序优先
翻译最新的 N 条，其余条目保留原文）。未设置时不做限制。任何调用失败
都会回退到保留原文，不会中断流水线。

```bash
# 完全免费、离线的本地方案
ollama pull qwen2.5:7b
AI_PROVIDER=ollama OLLAMA_MODEL=qwen2.5:7b npm run collect
```

## 历史日报

采集器每次运行会在 `IntelligenceHub/public/data/history/<YYYY-MM-DD>.json` 写入当日完整快照，并自动清理 30 天前的快照。
站点提供 `/history/` 索引页与 `/history/[date]/` 日报详情页，首页默认仅展示当日新闻并附跳转入口。

## 服务器部署配置

`IntelligenceHub` 使用 Next.js 静态导出（`output: 'export'` + `trailingSlash: true`），
每个路由会落到 `<route>/index.html`（如 `out/history/index.html`、`out/news/<id>/index.html`）。
浏览器请求 `/history/`、`/events/`、`/risk/`、`/bias/`、`/news/<id>/` 等链接时，
**Web 服务器必须能自动把目录请求回退到目录内的 `index.html`**，否则会全部返回 404。Next.js 16 的 `<Link>` 客户端导航还会去拉同目录下的
`index.txt` 作为 RSC 负载，因此 `.txt` 也要正常返回。

Nginx 推荐配置见 [`IntelligenceHub/deploy/nginx.conf.example`](./IntelligenceHub/deploy/nginx.conf.example)，
核心是：

```nginx
root /var/www/openintelhub;   # 与 collect-and-deploy.yml 中 REMOTE_TARGET 对应
index index.html;

location / {
    # 1. 直接命中文件（含 /history/index.html、/history/index.txt、/_next/static/…）
    # 2. 目录请求由 `index` 指令回退到 <dir>/index.html
    # 3. 兼容偶发的无斜杠链接
    try_files $uri $uri/ $uri.html =404;
}
```

只要包含 `try_files $uri $uri/ ...` + `index index.html;`，所有导航与新闻详情链接均可正常访问。

## 输出 JSON Schema

```ts
interface NewsItem {
  id: string;            // sha1(url)
  title: string;
  summary: string;
  titleCN?: string;      // 当 TRANSLATE_PROVIDER 启用且源语言非中文时填充
  summaryCN?: string;    // 同上
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

## License

MIT
