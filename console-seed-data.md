# Console 种子数据(Demo)

> 给 Codex:将以下数据写入数据库(直接 seed 脚本或走 /api/import 均可)。
> 仓位占比为占位示例,用户会自行修正,结构保持即可。

## 1. work_items(来自用户现有记事本,已映射状态)

```json
[
  { "name": "Engage SDK", "status": "scheduled", "note": "排期", "pinned": false },
  { "name": "ANR 治理", "status": "waiting", "note": "治理完成,等龙哥看低端机 C1", "pinned": false },
  { "name": "选本共创系统", "status": "in_progress", "note": "P0 完成,等待做 P1", "pinned": true },
  { "name": "Launcher 性能优化", "status": "scheduled", "note": "排期 app.onCreate", "pinned": false },
  { "name": "决策助手", "status": "archived", "note": "", "pinned": false },
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

## 3. profile_doc — status 层(近期状态,示例初稿,用户会改写)

```json
{
  "layer": "status",
  "content_md": "## 近期状态(2026-07)\n\n**主线**:个人控制台系统 Console 进入开发验收阶段(Phase 1-2),由 AI 结对开发,目标是替代记事本并建立跨 AI 的画像分发能力。\n\n**工作**:ANR 治理已完成待外部确认;选本共创系统 P0 落地,P1 排期中;Engage SDK 与 Launcher 性能优化在排期。\n\n**创作**:碳基灵感收容所推进'硅基生命的致命弱点'方向(参数固化 vs 人类经验自改写),棱角计划持续更新。\n\n**投资**:仓位结构按 A股CPO / A股存储 / A股半设 / QQQ / 美股半导体 / 美股存储 / 黄金 / 债券 / 现金 聚合维护,当前纪律是不做叙事驱动的反应式调仓。\n\n**基调**:平稳偏投入,周末在恢复 dates 节奏。"
}
```

## 4. profile_doc — 其余四层(仅占位一句话,等用户与 AI 协作撰写正式版)

```json
[
  { "layer": "core", "content_md": "(待撰写:身份、职业、性格与沟通偏好、人生主线。约 1500 字。)" },
  { "layer": "investing", "content_md": "(待撰写:投资框架、结构概述、行为弱点、AI 应扮演的刹车角色。约 800 字。)" },
  { "layer": "creative", "content_md": "(待撰写:两个公众号定位、写作风格、世界观设定摘要。约 800 字。)" },
  { "layer": "private", "content_md": "(待撰写:仅完整版分发。)" }
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
