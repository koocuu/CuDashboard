# PRD v2(定稿):个人画像 RAG + 人生状态 Dashboard(代号:Console)

版本:v2.0(取代 v1.0,范围大幅收缩,以本文档为准)
实施口径更新:2026-07-11(同步当前已上线的信息架构、金额持仓与 MCP 月度审计)
面向读者:AI 开发工具(Codex / Claude Code)及开发者本人

---

## 0. v1 → v2 变更摘要(给已开工的项目)

- **砍掉**:创作/情感/健身/感悟/决策日志板块的全部手动录入 UI;交易日志手动录入;日历与一切日期字段;proposal 之外的审核机制
- **保留**:画像层完整设计(四层/双版本/三写入通道/proposal 确认流)、工作板块、持仓一览、鉴权、备份、技术约束
- **新增**:首页"当前状态卡"(渲染画像 status 层)、工作事项零摩擦快速录入、手动置顶、"想做未做"状态
- **原则变更**:未来任何新板块上线的唯一前提是"数据入口已存在"(见 1.3 铁律)

---

## 1. 产品定义

### 1.1 一句话定义

一个持久化的个人画像系统(可被任何 AI 读取和更新)+ 一个让用户十秒看清自己当前状态的 Dashboard。

### 1.2 两大组成

**A. AI 画像层(产品灵魂)**
一份策展过的、分层的个人画像文档。用户使用任何 AI(Claude/GPT/Grok/DeepSeek/豆包)时,通过链接或粘贴交付画像,AI 立刻获得完整用户上下文;任何 AI 也可通过三条通道提交画像更新,经用户 diff 确认后生效。

**B. 人生状态 Dashboard(日常入口)**
单屏首页,回答"我现在的状态是什么、手头有什么事"。核心使用场景只有两个:
- 工作日早上到工位看一眼
- 临时想到一件事(新任务 / 最近要做 / 一直没做的),随手记下来图个心安

打开中的 App 页(Dashboard / 提案 / 投资等)通过 `/api/live-revision` 轻量轮询自动刷新:仅当提案、画像、持仓、工作事项或选题批次变更时才 `router.refresh()`,不是 WebSocket 实时推送。

### 1.3 板块铁律(防止范围通胀)

**一个板块要进 Dashboard,必须先回答"它的数据从哪来"。**
- 工作事项:用户手动(已验证的真实习惯,替代现有记事本)✅
- 持仓:金额可低频手动修正;正式月更由 AI 通过 MCP 提交完整金额快照与审计,用户确认后生效✅
- 灵感/感悟/情感/健身/决策:数据真实入口是 AI 对话,在 MCP 建成、AI 实际写入数据之前,**不做任何 UI**。板块跟着数据走,不跟着想象走。

### 1.4 明确不做

多用户、实时行情、向量检索、原生 App、日历/日期/截止时间/逾期提醒、甘特图、手动录入的内容型板块(灵感/感悟等)。

---

## 2. 技术架构(与 v1 相同)

| 层 | 选型 |
|---|---|
| 框架 | Next.js(App Router)+ TypeScript |
| 部署 | Vercel(用户已有域名) |
| 数据库 | Neon Postgres,ORM 用 Drizzle 或 Prisma |
| UI | Tailwind + shadcn/ui,桌面主场、移动端响应式,PWA |
| 备份 | Vercel Cron 每日全量 Markdown 快照 → GitHub 私有仓库 |

**硬性技术约束:**
1. 中文全文检索禁用默认 tsvector,必须 `pg_trgm` + GIN 索引 + ILIKE
2. 所有内容正文以 Markdown 存储,结构化字段独立成列
3. 全部软删除(`deleted_at`),物理删除仅手动操作数据库
4. 时间存 UTC,展示按 Asia/Shanghai
5. 桌面端优先保证单屏可扫读,移动端保持单列可用,PWA 可加主屏

---

## 3. 鉴权(与 v1 相同)

- **Web 登录**:单用户,环境变量存 bcrypt 密码哈希,httpOnly JWT session(30 天),登录接口限速
- **API Token**:多个可命名、可吊销的 Bearer token,两档权限——`read`(读画像/导出/检索)、`write`(额外可提交画像 proposal)。Token 管理页含最后使用时间

---

## 4. 数据模型(v2 精简版)

```
users               -- 单行,偏好设置
api_tokens          -- id, name, token_hash, scope, last_used_at, revoked_at

work_items
  id, name, category,
  status(someday/scheduled/in_progress/done),
  note, pinned(bool), sort_order, created_at, updated_at, done_at, deleted_at

holdings
  id, market(cn/us/other), symbol, name, amount_cny,
  position_pct(兼容字段,展示时由金额计算), cost_note,
  thesis_md(买入逻辑), status(active/watching/exited),
  created_at, updated_at, deleted_at

holding_proposals
  id, snapshot(jsonb), month, review_data(jsonb), summary,
  source, source_name, status(pending/approved/rejected), created_at, resolved_at

profile_doc         -- 画像文档
  id, layer(core/status/investing/relationship), content_md, version, updated_at

profile_proposals
  id, layer, proposed_content_md, diff_summary,
  source(api/paste/mcp), source_name,
  status(pending/approved/rejected), created_at, resolved_at

profile_versions    -- 每次 approve 归档旧版

entries             -- 通用条目表:建表但 v2 阶段无任何录入 UI,
  id, section_key, type, title, content_md, tags(text[]),   -- 仅为 MCP 时代预留,
  status, metadata(jsonb), created_at, updated_at, deleted_at -- /api/search 可检索它
```

v1 中的 trades / ideas / topics / lore_cards / workouts / decisions 表**全部不建**。未来 MCP 时代若需要,再按实际写入需求增量迁移。

---

## 5. AI 画像层(与 v1 设计一致,此处为完整规格)

### 5.1 原则

画像是**策展过的叙事文档**,不是数据导出。数据是事实,画像是"AI 应该如何理解这个人"。画像独立撰写维护,不由板块数据自动生成。

### 5.2 四层结构

| 层 | 内容 | 目标长度 |
|---|---|---|
| core | 身份、职业、性格与沟通偏好、人生主线；创作附录并入末尾 | ~2000 字 |
| status | 「内部状态」(纪律与近况，AI 默认可读) + 「公开状态」(策展后同步 koocuu.com /now) | 内部常更；公开短文 |
| investing | 投资框架、持仓结构、行为弱点、AI 刹车角色；投资历程并入末尾 | ~1500 字 |
| relationship | 情感与社交细节、关系复盘(原 private；仅完整版分发) | 按需 |

已废弃整层: `creative` / `milestones` / `public` / `private`(内容已迁移，不删字)。

### 5.3 分发版本

- **完整版** = 四层全开(给主力信任 AI)
- **通用版** = core + status + investing，排除 relationship
- MCP `get_profile` 不传 layers 时返回权限内全部四层，不做默认收窄
- 分发页可自由勾选层组合;返回内容头部自动附一行使用说明与生成日期
- 网站 /now 只同步 status「公开状态」节，与分发勾选无关

### 5.4 读取通道

1. `GET /c/<slug>` 分享页;`/c/<slug>/full` 完整版。URL 本身即只读凭证,可命名、可吊销
2. Dashboard 画像页一键复制全文——兼容一切 AI 的主通道
3. 支持 MCP 的 AI 通过 `get_profile` 直接读取纯净画像层

### 5.5 写入通道(全部为提案制,AI 不能直接改)

1. **REST**:`POST /api/profile/proposals`(write token),body `{ layer, proposed_content_md, summary }`
2. **更新块粘贴**(全 AI 兼容兜底):AI 在对话中输出如下块,用户粘贴进 Dashboard"导入更新"框,系统解析创建 proposal:

```
<<<PROFILE_UPDATE
layer: status
summary: 一句话变更说明
---
(该层完整新版本 Markdown)
PROFILE_UPDATE>>>
```

解析:提取包裹块;`---` 前为元信息(layer 必填);格式非法给出具体错误提示。

3. **MCP Server(Phase 3)**:`get_profile` / `search_entries` / `propose_profile_patch` / `propose_profile_update` / `propose_monthly_investment_update`。画像和投资写入均先创建待确认提案。`propose_profile_patch` 用于按二级标题和条目标题做局部增删改；同一调用方连续修改同一层时累积到同一个 pending proposal，其他来源已有 pending 时拒绝自动合并。

### 5.6 确认流程

首页角标提示待处理 proposal → 详情页展示当前版 vs 提案版逐行 diff → 可编辑后批准 → 旧版入 profile_versions(可回滚),version+1。

---

## 6. Dashboard 规格

### 6.1 首页(单屏,自上而下)

1. **当前状态卡**:渲染画像 `status` 层的 Markdown。这是画像与 Dashboard 的唯一交汇点——AI 更新 status 层、用户确认后,这张卡自动变化
2. **待确认角标**:有 pending proposal 时显示,点击进确认页
3. **置顶焦点区**:pinned=true 的工作事项(无日期、无逾期概念,纯手动钉/取消)
4. **工作台账**:完整列表按想做未做/排期待做/进行中/已完成分组,首页直接操作
5. **持仓一览摘要**:持仓数 + 仓位结构迷你图,点击进板块
6. **AI 写入动态**:最近 proposal 与合并记录流水

### 6.2 工作板块

- **零摩擦快速录入**:列表顶部常驻单行输入框,输入回车即创建(status=someday),可选轻分类
- 状态集:想做未做(someday)→ 排期待做(scheduled)→ 进行中(in_progress)→ 已完成(done)
- 视图:按状态分组;"想做未做"视觉平静;"已完成"折叠;可按用户自定义分类筛选
- 交互:点击状态圆点前进、行内编辑、置顶、组内/跨栏拖拽;置顶与状态互不影响
- **反焦虑约束**:全站不出现"逾期""x 天未处理"类文案,不用红色警示已存在的事项

### 6.3 持仓板块

- 按市场分组列表:名称/代号、折人民币金额、自动占总资产比例、买入逻辑
- 总资产包含显式现金余额;环图切片合计 100%,中心显示非现金已投资比例
- 观察池分区(status=watching):记录想买理由,供事后验证冲动
- 名称和金额可手动修正;正式月更走 MCP 固定模板提案
- 月度审计固定四段:本月结论、触发与纪律、本月动作、下月核验;批准持仓提案时固化同节点快照

---

## 7. REST API

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | /c/<slug> | share | 网页式画像分享 |
| GET | /api/export | read | 全量数据导出(结构化 Markdown 打包 zip) |
| GET | /api/search?q= | read | pg_trgm 全文检索(entries + work_items + holdings) |
| POST | /api/profile/proposals | write | 提交画像修改提案 |
| GET | /api/profile/proposals | write | 查询提案状态 |
| POST | /api/import | write | 批量导入(格式实现时定义并写入 README,用于初始迁移) |
| POST | /api/mcp | read/write | 远程 MCP(JSON-RPC),支持 Bearer 与 OAuth |

---

## 8. 分期与验收

### Phase 1:地基 + 工作板块 + 首页骨架

验收:
1. 手机登录并添加到主屏幕,体验接近原生;未登录访问一律拦截
2. 快速录入:首页或板块页输入一行文字回车,事项即出现,全程 ≤2 秒
3. 状态流转、置顶、拖拽、行内编辑全部可用;多设备数据一致
4. 首页展示置顶区与工作摘要;GitHub 出现每日快照 commit
5. 全站无任何日期/截止/逾期元素

### Phase 2:画像层 + 持仓

验收:
1. 五层画像可编辑,版本历史可回滚
2. `/c/<slug>` 分享页可读取通用版且不含 private;复制文本同样生效
3. write token POST 提案 → 首页角标 → diff 清晰 → 批准生效可回滚
4. AI 输出的更新块粘贴导入,成功创建 proposal;格式错误时提示具体原因
5. 首页"当前状态卡"渲染 status 层,批准 proposal 后刷新可见变化
6. 持仓名称/金额增删改可用,比例由金额计算;现金计入总资产,中心显示已投比例;/api/export 与 /api/import 可用

### Phase 3:MCP Server

验收:claude.ai 添加 Connector 后,可 get_profile、search_entries、提交整层或局部画像提案和固定格式月度投资提案;连续局部修改只产生一个累计 pending proposal;所有写入仍走确认流。

---

## 9. UI 基调

暖米白浅色为默认;桌面端双栏主场、移动端单列;中文小标题、数字等宽;珊瑚/鼠尾草绿/雾蓝按功能使用;无阴影、无渐变、无焦虑向红色告警。

## 10. 给开发 AI 的提醒

1. 严格按 Phase 顺序,不要一次生成全部
2. 迁移脚本显式 `CREATE EXTENSION IF NOT EXISTS pg_trgm`
3. 分享页使用 `/c/<slug>` 普通网页形态;MCP `get_profile` 返回纯净层内容,不带分发包装
4. 更新块解析器错误提示要具体(缺 layer、包裹符不完整等)
5. 环境变量清单写入 README:DATABASE_URL、密码哈希、JWT_SECRET、GitHub 备份配置
6. 若项目已有 v1 阶段代码:保留鉴权与工作板块,删除未使用板块的页面与表,对照第 4 节收敛数据模型
