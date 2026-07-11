# Console · 个人画像 RAG + 人生状态 Dashboard

依据 `PRD-个人知识库系统.md` v2.0 开发。开发进度见 [`开发进度.md`](开发进度.md)。

当前范围:**v2 Phase 1–3 已实现**。v1 的创作/情感/健身/感悟/决策/交易日志手动 UI 已按 v2 收敛移除。

## 技术栈

Next.js 15(App Router) · TypeScript · Tailwind CSS · Drizzle ORM · Neon Postgres · JWT(jose) · @dnd-kit · PWA

## 快速开始

```bash
npm install
cp .env.example .env

# 1) 生成登录密码哈希,拷贝到 .env 的 AUTH_PASSWORD_HASH
npm run hash -- 你的明文密码

# 2) 执行迁移和中文检索索引
npm run db:migrate
npm run db:trgm

# 3) 导入 demo 数据(来自 console-seed-data.md,可重复执行)
npm run seed:demo

# 4) 启动
npm run dev
```

访问 http://localhost:3000 → 自动跳登录页 → 输入密码进入。

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | Neon Postgres 连接串(`?sslmode=require`) |
| `AUTH_PASSWORD_HASH` | 登录密码的 bcrypt 哈希,用 `npm run hash` 生成 |
| `JWT_SECRET` | JWT 签名密钥,`openssl rand -base64 48` |
| `USER_NAME` | 画像头部展示名 |
| `GITHUB_BACKUP_TOKEN` | 仅授权备份私库的 fine-grained PAT(`Contents: Read and write`) |
| `GITHUB_BACKUP_REPO` | 备份仓库 `owner/repo` |
| `GITHUB_BACKUP_BRANCH` | 备份分支(默认 `main`) |
| `CRON_SECRET` | 保护 `/api/cron/backup` 的 Bearer 密钥 |

## v2 功能

- 首页:画像 `status` 当前状态卡、pending proposal 角标、置顶工作事项、工作摘要、持仓摘要、AI 写入动态、备份失败告警
- 工作:快速录入、状态流转、轻分类筛选、置顶、组内/跨栏拖拽、行内编辑、软删除
- 持仓:按 A 股/美股/其他分组维护人民币金额,占总资产比例自动计算;名称、买入逻辑、观察池和结构图可用
- 投资复盘:由 MCP 提交固定四段月度审计与全量金额持仓,用户批准后同步保存总结和当月快照
- 画像:五层 Markdown、完整版/通用版/自定义分发、一键复制、版本历史、回滚
- Proposal:REST/write token、粘贴更新块、MCP 三条写入通道,全部需用户 diff 确认
- Token:read/write token 生成、吊销、最后使用时间
- MCP:`get_profile` / `search_entries` / `propose_profile_update` / `propose_monthly_investment_update`
- 导入导出:`/api/import` JSON 导入,`/api/export` 全量 Markdown ZIP
- 备份:Vercel Cron 每日全量 Markdown 快照到 GitHub 私库;未配置视为未启用,启用后失败或 48 小时未成功才告警
- Demo seed:`npm run seed:demo` 导入 `console-seed-data.md` 对应的工作事项、持仓、画像层和一条 pending proposal

## 目录结构

```text
app/
  (app)/
    dashboard/      # v2 单屏状态首页
    work/           # 工作台账
    invest/         # 持仓一览
    profile/        # 画像、分发、提案、token
  api/
    auth/           # 登录 / 登出
    work-items/     # 工作事项 CRUD + reorder
    holdings/       # 持仓 CRUD
    profile/         # 画像层、提案、粘贴导入、回滚
    tokens/          # API token 管理
    search/          # entries + work_items + holdings 中文检索
    import/ export/  # JSON 导入 / Markdown ZIP 导出
    mcp/             # JSON-RPC MCP Server
    cron/backup/     # 每日全量 Markdown 备份
lib/
  db/schema.ts       # v2 精简模型
  auth/              # session + bearer token
  queries/           # work / invest / profile / search / backup
  export.ts          # 全量 Markdown 文件导出
  zip.ts             # 无依赖 ZIP 打包
```

## 公开 API

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| `GET` | `/c/<slug>` | share | 分享页式画像分发 |
| `GET` | `/api/export` | read | 下载全量 Markdown ZIP |
| `GET` | `/api/search?q=关键词` | read | 检索 entries + 工作 + 持仓 |
| `POST` | `/api/profile/proposals` | write | 创建画像修改提案 |
| `GET` | `/api/profile/proposals` | write | 查询提案状态 |
| `POST` | `/api/import` | write | 批量导入 |
| `POST` | `/api/mcp` | read/write | MCP JSON-RPC |

`/api/import` 示例:

```json
{
  "work_items": [{ "name": "整理 Console v2", "status": "inbox", "pinned": true }],
  "holdings": [{ "market": "us", "symbol": "NVDA", "name": "英伟达", "amountCny": 100000 }],
  "entries": [{ "sectionKey": "ai", "type": "note", "contentMd": "MCP 写入的预留条目" }],
  "profile_doc": {
    "core": "核心画像 Markdown",
    "status": "近期状态 Markdown"
  }
}
```

## 约定

- 全站不做日期、截止、逾期提醒。
- 中文检索使用 `pg_trgm + GIN + ILIKE`,不用默认 `tsvector`。
- 所有内容正文以 Markdown 存储,结构化字段独立成列。
- 所有时间存 UTC,展示按 Asia/Shanghai。
- 删除均为软删除。

## Claude.ai 连接远程 MCP

此项目在同一个 Vercel 部署里提供远程 MCP Server:

```text
https://dashboard.koocuu.com/api/mcp
```

MCP 地址可在 dashboard 的 `画像` 页标题栏直接复制。写入不会直接覆盖画像,只会创建待确认 proposal,需要在 dashboard 里查看 diff 并批准。

在 claude.ai 中添加连接器:

1. 打开 claude.ai 的 `设置 -> 连接器 -> 添加自定义连接器`。
2. URL 填写 `https://dashboard.koocuu.com/api/mcp`。
3. 按页面提示完成 OAuth 授权。

Claude Code / Cursor / 脚本可继续使用 Bearer token:在 dashboard 的 `画像 -> Token 管理` 里生成 API token,请求时传 `Authorization: Bearer <你的 API token>`。

连接成功后 Claude 可使用四个工具:

- `get_profile`: 读取画像层,可用 `layers` 指定 `core/investing/creative/status/private`。
- `search_entries`: 搜索工作事项、持仓和通用条目。
- `propose_profile_update`: 提交画像修改的待确认提案,不会直接写入画像。
- `propose_monthly_investment_update`: 提交“全量人民币金额持仓 + 固定四段月度审计”的待确认提案。持仓必须包含 `CASH` 余额项；审计字段固定为 `conclusion`、`triggers_and_rules`、`actions`、`next_month_checks`。用户在投资页批准后，两部分才在同一节点生效。
