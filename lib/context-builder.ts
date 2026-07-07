import { getAllLayers } from "@/lib/queries/profile";
import { LAYER_META, LAYER_ORDER, PRESET_VERSIONS } from "@/lib/profile-meta";
import type { ProfileLayer } from "@/lib/db/schema";

/** 按 Asia/Shanghai 的 YYYY-MM-DD。 */
function today(): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  })
    .format(new Date())
    .replace(/\//g, "-");
}

/**
 * 组装画像 Markdown 包(PRD 6.4:头部附说明行)。
 * layers 为要包含的层(已排序前会重新按 LAYER_ORDER 排)。
 */
export async function buildContextPackage(
  layers: ProfileLayer[],
): Promise<string> {
  const all = await getAllLayers();
  const byLayer = new Map(all.map((l) => [l.layer, l]));
  const userName = process.env.USER_NAME || "用户";

  const ordered = LAYER_ORDER.filter((l) => layers.includes(l));

  const header = `> 这是 ${userName} 的个人画像,生成于 ${today()},请以此理解用户并遵循其中的沟通偏好。\n`;

  const parts: string[] = [header];

  for (const layer of ordered) {
    const doc = byLayer.get(layer);
    const content = doc?.contentMd?.trim();
    if (!content) continue;
    parts.push(`\n## ${LAYER_META[layer].label}\n\n${content}`);
  }

  if (parts.length === 1) {
    parts.push("\n_(画像内容为空,请先在 Dashboard 编辑各层)_");
  }

  return parts.join("\n");
}

/** 解析 profile 参数:full / general / 自定义 layers=a,b,c。 */
export function resolveLayers(
  profile: string | null,
  layersParam: string | null,
): ProfileLayer[] {
  if (layersParam) {
    const requested = layersParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return LAYER_ORDER.filter((l) => requested.includes(l));
  }
  if (profile === "full") return PRESET_VERSIONS.full.layers;
  // 默认通用版(不含 private)
  return PRESET_VERSIONS.general.layers;
}
