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

## 历史日报

采集器每次运行会在 `IntelligenceHub/public/data/history/<YYYY-MM-DD>.json` 写入当日完整快照，并自动清理 30 天前的快照。
站点提供 `/history/` 索引页与 `/history/[date]/` 日报详情页，首页默认仅展示当日新闻并附跳转入口。

## GitHub Actions

| Workflow | 触发 | Job |
|----------|------|-----|
| [`ci.yml`](.github/workflows/ci.yml) | PR / push | 安装依赖、lint、typecheck、test |
| [`collect-and-deploy.yml`](.github/workflows/collect-and-deploy.yml) | cron（每 6 小时） + 手动触发 | collect → analyze → 构建站点 → 通过 [`easingthemes/ssh-deploy@v6.0.3`](https://github.com/easingthemes/ssh-deploy) SSH 部署 |

部署所需仓库 secrets：

- `SSH_PRIVATE_KEY` — 目标服务器的部署私钥
- `REMOTE_HOST` — 服务器主机名 / IP
- `REMOTE_USER` — SSH 用户
- `REMOTE_TARGET` — 服务器上的绝对路径（如 `/var/www/openintelhub`）
- `OPENAI_API_KEY` *(可选)* — 启用 LLM 分析（否则走 heuristic）

## 输出 JSON Schema

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

## 协作规范

- 提交信息遵循 **Angular Commit Convention**，详见 [`.github/copilot-instructions.md`](.github/copilot-instructions.md)。
- PR 默认审核人：`@unknowIfGuestInDream`（见 [`.github/CODEOWNERS`](.github/CODEOWNERS)）。
- 依赖通过 [`.github/dependabot.yml`](.github/dependabot.yml) 周更新。

## 备案信息

页面底部展示：

- ICP 备案：辽ICP备2021000033号
- 公安备案：辽公网安备21020302000532号

## Roadmap

- 基于 RAG 的新闻语料检索与问答
- 全球事件时间线与传播链分析
- 社交媒体交叉验证
- Telegram 推送 / 邮件日报
- 风险预警规则引擎

## License

MIT
