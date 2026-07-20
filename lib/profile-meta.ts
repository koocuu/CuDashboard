import type { ProfileLayer } from "@/lib/db/schema";

export const LAYER_META: Record<
  ProfileLayer,
  { label: string; desc: string; target: string; order: number }
> = {
  core: {
    label: "核心层",
    desc: "身份、职业、性格与沟通偏好、人生主线、创作附录",
    target: "~2000 字",
    order: 0,
  },
  status: {
    label: "近期状态",
    desc: "内部状态（纪律与近况）+ 公开状态（同步网站 /now）",
    target: "内部常更新；公开节策展后同步",
    order: 1,
  },
  investing: {
    label: "投资附录",
    desc: "投资框架、持仓结构、行为弱点、AI 角色、投资历程",
    target: "~1500 字",
    order: 2,
  },
  relationship: {
    label: "关系层",
    desc: "情感与社交细节、关系复盘（原私密层；仅完整版分发）",
    target: "按需",
    order: 3,
  },
};

export const LAYER_ORDER: ProfileLayer[] = [
  "core",
  "status",
  "investing",
  "relationship",
];

/** 两个预设分发版本包含的层。 */
export const PRESET_VERSIONS = {
  full: {
    label: "完整版",
    desc: "四层全开，含关系层，给主力信任 AI",
    layers: ["core", "status", "investing", "relationship"] as ProfileLayer[],
  },
  general: {
    label: "通用版",
    desc: "core + status + investing，排除关系层",
    layers: ["core", "status", "investing"] as ProfileLayer[],
  },
};

/** 已无整层提案专用层；公开状态是 status 内的一节。 */
export function isProposalOnlyLayer(_layer: ProfileLayer | string): boolean {
  return false;
}
