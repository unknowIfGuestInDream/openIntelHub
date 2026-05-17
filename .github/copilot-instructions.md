# OpenIntelHub Copilot 协作说明

> 本文件为 GitHub Copilot 及其他 AI 协作工具在本仓库内工作时的指导规范。

## 项目概览

OpenIntelHub 是一个由 AI 驱动的全球新闻情报聚合平台，从 15+ 国际主流媒体抓取 RSS 内容，
进行去重、聚类与多维度评分（重要性、风险、情感、地缘影响、市场影响、军事相关、叙事偏向），
并以静态站点形式展示，由 GitHub Actions 周期性重建并发布。

主要语言：**简体中文**；明暗主题随浏览器 `prefers-color-scheme` 自动切换。

## 仓库结构

TypeScript Monorepo，包含两个 workspace：

| Workspace | 作用 | 技术栈 |
|---|---|---|
| [`intel-collector/`](../../intel-collector) | RSS / HTML 抓取、AI 分析、去重、事件聚类，产出 JSON | Node.js、TypeScript、`rss-parser`、`cheerio`、`pino` |
| [`IntelligenceHub/`](../../IntelligenceHub) | 消费 collector JSON 的静态可视化站点 | Next.js（静态导出 `output: 'export'`）、TypeScript、TailwindCSS、ECharts |

数据流：

```
intel-collector → public/data/news.json
                → public/data/history/<YYYY-MM-DD>.json   （保留 30 天）
                → IntelligenceHub 静态构建 → out/
```

## 常用命令

```bash
# 安装全部 workspace 依赖
npm install

# 采集新闻（产物写入 intel-collector/output/ 与 IntelligenceHub/public/data/）
npm run collect

# 站点构建 / 预览
npm run -w IntelligenceHub build
npm run -w IntelligenceHub start

# 校验
npm run -w intel-collector typecheck
npm run -w intel-collector test
npm run -w IntelligenceHub typecheck
npm run -w IntelligenceHub lint
```

提交前请至少跑通 `typecheck` 与 `test`。

## 代码风格

- 全部使用 **TypeScript**，严格类型，禁止 `any` 渗漏到公共 API。
- 缩进 2 空格，字符串优先使用单引号，行尾分号保留（遵循仓库已有的 `.prettierrc`）。
- 文案、注释、用户可见字符串使用 **简体中文**；标识符、变量名仍用英文。
- 优先复用 Tailwind 既有 `slate-*` / `brand-*` 工具类；新增主题色请在 `tailwind.config.ts` 中扩展。
- 新增/修改公共数据形状时，请同步更新 `intel-collector/src/types.ts` 与 `IntelligenceHub/src/lib/types.ts`。

## 测试约定

- 使用 Node 内置的 `node:test`。新增逻辑须有对应单元测试，放在对应 workspace 的 `test/` 目录下，文件名为 `*.test.ts`。
- 纯函数请显式注入时间（如 `now: number = Date.now()`）以便确定性测试，可参考 `intel-collector/src/history.ts`。

## 新增数据源

在 `intel-collector/src/config/sources.ts` 数组中追加一条 `MediaSource` 即可，
字段含义见 `intel-collector/src/types.ts`。`accessibleInChina` 字段必填，
便于消费方根据访问环境过滤。

## Commit 规范（强制）

使用 **Angular Commit Convention**（参考 https://github.com/angular/angular/blob/main/contributing-docs/commit-message-guidelines.md）：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 允许的 `type`

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修复 bug |
| `docs` | 仅文档变更 |
| `style` | 不影响代码逻辑的格式化 / 空白 / 标点 |
| `refactor` | 既非新功能也非修复 bug 的重构 |
| `perf` | 性能优化 |
| `test` | 新增 / 修改测试 |
| `build` | 构建系统、外部依赖变更 |
| `ci` | CI 配置与脚本变更 |
| `chore` | 其它杂项（依赖升级、脚手架等） |
| `revert` | 回滚之前的 commit |

### `scope` 建议

`collector`、`site`、`ci`、`deps`、`docs`、`history`、`theme`、`i18n` 等，
对应改动的模块或主题；如改动跨多个模块可省略 scope。

### 示例

```
feat(collector): add GitHub Blog RSS source
fix(site): hydrate ECharts theme on prefers-color-scheme change
docs(readme): translate README into Simplified Chinese
chore(deps): bump next to 15.5.18
```

### Subject 行规则

- 使用祈使句、现在时（"add" 而非 "added" / "adds"）。
- 句首小写，句末不加句号。
- 不超过 72 个字符。

### Body / Footer

- 解释**为什么**，而非**做了什么**。
- 重大破坏性变更须在 footer 标注 `BREAKING CHANGE: <说明>`。
- 关联 issue 在 footer 写 `Closes #123` / `Refs #123`。

## PR 规范

- 标题遵循同样的 Angular 格式。
- 描述使用中文，包含动机、关键改动、验证方式（命令 + 截图）。
- 默认审核人：`@unknowIfGuestInDream`（见 `CODEOWNERS`）。

## 安全与隐私

- 严禁在仓库或日志中提交任何 secret / API key。
- 接入外部源时确认其 RSS 公开授权，避免抓取受限内容。
