import type { ProfileLayer } from "@/lib/db/schema";

export const LAYER_META: Record<
  ProfileLayer,
  { label: string; desc: string; target: string; order: number }
> = {
  core: {
    label: "核心层",
    desc: "身份、职业、性格与沟通偏好、当前人生主线",
    target: "~1500 字",
    order: 0,
  },
  milestones: {
    label: "人生重要节点",
    desc: "塑造当下选择的重要经历、转折、决定与阶段性里程碑",
    target: "~1000 字,按时间倒序",
    order: 1,
  },
  investing: {
    label: "投资附录",
    desc: "投资框架、持仓结构概述、行为弱点、希望 AI 扮演的角色",
    target: "~800 字",
    order: 2,
  },
  creative: {
    label: "创作附录",
    desc: "两个公众号定位、写作风格、世界观设定摘要",
    target: "~800 字",
    order: 3,
  },
  status: {
    label: "近期状态",
    desc: "最近 1-2 个月在忙什么、情绪基调、正在纠结的事",
    target: "~500 字,更新最频繁",
    order: 4,
  },
  private: {
    label: "私密层",
    desc: "情感细节、敏感信息(仅完整版包含)",
    target: "按需",
    order: 5,
  },
  public: {
    label: "公开层 /now",
    desc: "写给网站 /now 的公开近况;独立撰写,不从其他层过滤生成;批准后同步到 koocuu.com",
    target: "短文,含 season 与若干 ## 小节",
    order: 6,
  },
};

export const LAYER_ORDER: ProfileLayer[] = [
  "core",
  "milestones",
  "investing",
  "creative",
  "status",
  "private",
  "public",
];

/** 两个预设分发版本包含的层。默认不含 public,避免网站公开稿混进 AI 上下文。 */
export const PRESET_VERSIONS = {
  full: {
    label: "完整版",
    desc: "core + 人生节点 + 全部附录 + private,给主力信任 AI",
    layers: [
      "core",
      "milestones",
      "investing",
      "creative",
      "status",
      "private",
    ] as ProfileLayer[],
  },
  general: {
    label: "通用版",
    desc: "core + 人生节点 + 附录,自动排除 private,给任意新 AI",
    layers: [
      "core",
      "milestones",
      "investing",
      "creative",
      "status",
    ] as ProfileLayer[],
  },
};

/** public 层只能走 proposal 批准写入,禁止直接编辑 / import / rollback。 */
export function isProposalOnlyLayer(layer: ProfileLayer | string): boolean {
  return layer === "public";
}
