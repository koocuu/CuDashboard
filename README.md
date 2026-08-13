# Console · 个人画像 RAG + 作品墙 + 今日

依据 `PRD-个人知识库系统.md` v2.1 开发。开发进度见 [`开发进度.md`](开发进度.md)。

当前范围:**v2 Phase 1–3 已实现**；2026-08-13 信息架构改为 **今日 / 项目 / 画像**。选题降为备查。v1 的创作/情感/健身/感悟/决策/交易日志手动 UI 已按 v2 收敛移除。

## 技术栈

Next.js 15(App Router) · TypeScript · Tailwind CSS · Drizzle ORM · Neon Postgres · JWT(jose) · @dnd-kit · PWA

## 快速开始

```bash
npm install
cp .env.example .env

# 1) 生成登录密码哈希,拷贝到 .env 的 AUTH_PASSWORD_HASH
npm run hash -- 你的明文密码

# 2) 本地执行迁移和中文检索索引（Vercel 部署会在 build 里自动跑 migrate / trgm / seed:projects）
npm run db:migrate
npm run db:trgm
npm run seed:projects

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

- 今日:画像 status、待确认、作品摘要、手头的事(忙时主位、闲时可不看)、仓位摘要、备份告警
- 项目:作品墙(在做 / 已上线 / 暂停)，与工作事项分开；MCP `get_projects` 同源只读
- 工作:快速录入、状态流转、轻分类筛选、置顶、组内/跨栏拖拽、行内编辑、软删除
- 持仓:按 A 股/美股/其他分组维护人民币金额,占总资产比例自动计算;名称、买入逻辑、观察池和结构图可用
- 投资复盘:由 MCP 提交固定四段月度审计与全量金额持仓,用户批准后同步保存总结和当月快照,并自动生成 `audit-sync` 的 status 层投资纪律联动提案
- 画像:四层 Markdown(core/status/investing/relationship)、完整版/通用版/自定义分发、一键复制、版本历史、回滚；status 含内部状态与公开状态，公开状态同步网站 /now；超过 35 天未更新时首页眉标提示
- Proposal:REST/write token、粘贴更新块、MCP 写入通道,全部需用户 diff 确认
- Token:read/write token 生成、吊销、最后使用时间
- MCP:`get_profile` / `list_profile_layers` / `get_projects` / `search_entries` / `propose_profile_update` / `propose_profile_patch` / `propose_monthly_investment_update` / `get_topic_batch`（提交审计后应立刻更新 status）
- 导入导出:`/api/import` JSON 导入,`/api/export` 全量 Markdown ZIP
- 备份:Vercel Cron 每日全量 Markdown 快照到 GitHub 私库;未配置视为未启用,启用后失败或 48 小时未成功才告警
- Demo seed:`npm run seed:demo` 导入 `console-seed-data.md` 对应的工作事项、持仓、画像层和一条 pending proposal

## 目录结构

```text
app/
  (app)/
    dashboard/      # 今日
    projects/       # 作品墙
    work/           # 重定向到今日
    invest/         # 持仓一览
    profile/        # 画像、分发、提案、token
    topics/         # 选题备查（不进导航）
  api/
    auth/           # 登录 / 登出
    work-items/     # 工作事项 CRUD + reorder
    projects/       # 作品墙 CRUD
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

连接成功后 Claude 可使用这些工具:

- `get_profile`: 读取画像层；不传 `layers` 返回全部四层(`core/status/investing/relationship`)；可逗号指定子集。作品列表请用 `get_projects`，不要把项目墙当成画像层。
- `list_profile_layers`: 列出四层的简介与最后更新时间。
- `get_projects`: 读取作品墙（在做 / 已上线 / 暂停），与「项目」页同源；可选 `status` 过滤。
- `search_entries`: 搜索工作事项、作品、持仓和通用条目。
- `get_topic_batch`: 读取 topic-radar 最新选题候选（可选 `account=lengjiao|carbon`）；与画像提案无关。
- `propose_profile_patch`: 局部提案。`add/update/delete` 改 section 内单条；`replace_section` 整节替换（`new_content_md` 须以目标 `##` 开头；section 不存在则追加到层末）。同一调用方连续改同一层会累积到同一个 pending proposal。工具说明含主动识别提示：对话中出现稳定事实/原则/偏好变化时应主动提议，不必等用户要求「更新画像」。
- `propose_profile_update`: 提交画像修改的待确认提案,不会直接写入画像。同样适用主动识别原则（整层过期或稳定变化时主动提议重写）。
- `propose_monthly_investment_update`: 提交“全量人民币金额持仓 + 固定四段月度审计”的待确认提案。持仓必须包含 `CASH` 余额项；审计字段固定为 `conclusion`、`triggers_and_rules`、`actions`、`next_month_checks`。用户在投资页批准后，持仓与审计快照同节点生效，并自动生成 `audit-sync` 的 status 联动提案。提交后应立即再调 `propose_profile_update` 更新 status 层。
- HTTP:`POST /api/profile/proposals`（Bearer write token）用于画像提案；`POST /api/topic-batches` 用于 topic-radar 写入选题备查（不走提案、不进首页主场）。
