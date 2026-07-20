# Console 种子数据(Demo)

> 给 Codex:将以下数据写入数据库(直接 seed 脚本或走 /api/import 均可)。
> 持仓金额为 2026-07 聚合快照,九项合计 ¥904,646;占比由系统自动计算。

## 1. work_items(来自用户现有记事本,已映射状态)

```json
[
  { "name": "Engage SDK", "status": "scheduled", "note": "排期", "pinned": false },
  { "name": "ANR 治理", "status": "scheduled", "note": "治理完成,等龙哥看低端机 C1", "pinned": false },
  { "name": "选本共创系统", "status": "in_progress", "note": "P0 完成,等待做 P1", "pinned": true },
  { "name": "Launcher 性能优化", "status": "scheduled", "note": "排期 app.onCreate", "pinned": false },
  { "name": "决策助手", "status": "done", "note": "", "pinned": false },
  { "name": "棱角计划 / 碳基灵感收容所", "status": "in_progress", "note": "持续更新", "pinned": false },
  { "name": "个人主页", "status": "someday", "note": "有想法就更新", "pinned": false },
  { "name": "Console 个人控制台", "status": "in_progress", "note": "Phase 1-2 开发中", "pinned": true }
]
```

## 2. holdings(按 2026-07 用户真实资产结构聚合)

```json
[
  { "market": "cn", "symbol": "CN-CPO", "name": "A股CPO", "amount_cny": 351262, "status": "active",
    "thesis_md": "中航机遇领航C、永赢科技智选C、华泰柏瑞质量成长C、远东股份。CPO/光互连主线仓位。" },
  { "market": "cn", "symbol": "CN-MEM", "name": "A股存储", "amount_cny": 151064, "status": "active",
    "thesis_md": "永赢先锋半导体智选C。A股存储周期仓位。" },
  { "market": "cn", "symbol": "CN-EQUIP", "name": "A股半设", "amount_cny": 70970, "status": "active",
    "thesis_md": "东方人工智能主题C、半导设备个股。A股半导体设备仓位。" },
  { "market": "us", "symbol": "QQQ", "name": "QQQ", "amount_cny": 88739, "status": "active",
    "thesis_md": "五只纳指基金。美股科技指数底仓。" },
  { "market": "us", "symbol": "US-SEMI", "name": "美股半导体", "amount_cny": 87371, "status": "active",
    "thesis_md": "NVDA、SMH、SOXX。美股半导体仓位。" },
  { "market": "us", "symbol": "US-MEM", "name": "美股存储", "amount_cny": 67170, "status": "active",
    "thesis_md": "MU、DRAM、SNDK。美股存储仓位。" },
  { "market": "other", "symbol": "BOND", "name": "债券", "amount_cny": 18070, "status": "active",
    "thesis_md": "兴业120天债券A。防守仓位。" },
  { "market": "other", "symbol": "GOLD", "name": "黄金", "amount_cny": 20000, "status": "active",
    "thesis_md": "黄金。防守仓位。" },
  { "market": "other", "symbol": "CASH", "name": "现金", "amount_cny": 50000, "status": "active",
    "thesis_md": "现金/货基。" }
]
```

## 3. profile_doc — 四层(core / status / investing / relationship)

status 须含「## 内部状态」与「## 公开状态」；网站 /now 只读公开状态节。

```json
[
  { "layer": "core", "content_md": "(待撰写:身份、职业、性格与沟通偏好、人生主线、创作附录。)" },
  { "layer": "status", "content_md": "## 内部状态\n\n**主线**:…\n\n## 公开状态\n\n---\nseason: 2026 夏\n---\n\n## 在做\n\n…" },
  { "layer": "investing", "content_md": "(待撰写:投资框架、结构、弱点、历程。)" },
  { "layer": "relationship", "content_md": "(待撰写:情感与社交、关系复盘。仅完整版。)" }
]
```

## 5. profile_proposals(一条示例待确认提案,用于验证角标 → diff → 批准全流程)

```json
{
  "layer": "status",
  "source": "paste",
  "source_name": "Claude",
  "diff_summary": "示例提案:更新 Console 进度为'首页 UI 重构中'",
  "proposed_content_md": "(与现有 status 层内容一致,仅将'开发验收阶段'改为'首页 UI 重构中'——用于演示 diff 视图)",
  "status": "pending"
}
```
