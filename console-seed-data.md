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

## 2. holdings(占比为示例,结构按用户真实框架:CPO 主线 / 设备次线 / 存储持有)

```json
[
  { "market": "cn", "symbol": "300308", "name": "中际旭创", "position_pct": 20, "status": "active",
    "thesis_md": "CPO/光互连主线核心标的。AI 算力互连需求驱动,光模块龙头。" },
  { "market": "cn", "symbol": "300502", "name": "新易盛", "position_pct": 12, "status": "active",
    "thesis_md": "CPO 主线第二仓位,高速光模块弹性标的。" },
  { "market": "cn", "symbol": "002371", "name": "北方华创", "position_pct": 10, "status": "active",
    "thesis_md": "半导体设备次线,国产替代逻辑,长期持有。" },
  { "market": "cn", "symbol": "000000", "name": "存储标的(示例)", "position_pct": 8, "status": "active",
    "thesis_md": "存储周期持有仓,不加仓不减仓,等周期。" },
  { "market": "us", "symbol": "NVDA", "name": "NVIDIA", "position_pct": 25, "status": "active",
    "thesis_md": "美股锚定仓位,AI 算力核心。" },
  { "market": "us", "symbol": "SMH", "name": "VanEck 半导体 ETF", "position_pct": 15, "status": "active",
    "thesis_md": "半导体行业 β,平滑个股波动。" },
  { "market": "us", "symbol": "QQQM", "name": "Invesco 纳指 ETF", "position_pct": 10, "status": "active",
    "thesis_md": "指数底仓。" },
  { "market": "cn", "symbol": "688000", "name": "观察标的(示例)", "position_pct": 0, "status": "watching",
    "thesis_md": "观察池示例:记录想买的理由与当时价格,供事后验证冲动质量。" }
]
```

## 3. profile_doc — status 层(近期状态,示例初稿,用户会改写)

```json
{
  "layer": "status",
  "content_md": "## 近期状态(2026-07)\n\n**主线**:个人控制台系统 Console 进入开发验收阶段(Phase 1-2),由 AI 结对开发,目标是替代记事本并建立跨 AI 的画像分发能力。\n\n**工作**:ANR 治理已完成待外部确认;选本共创系统 P0 落地,P1 排期中;Engage SDK 与 Launcher 性能优化在排期。\n\n**创作**:碳基灵感收容所推进'硅基生命的致命弱点'方向(参数固化 vs 人类经验自改写),棱角计划持续更新。\n\n**投资**:仓位结构稳定(CPO 主线 + 设备次线 + 存储持有,美股 NVDA/SMH/QQQM 锚定),当前纪律是不做叙事驱动的反应式调仓。\n\n**基调**:平稳偏投入,周末在恢复 dates 节奏。"
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
