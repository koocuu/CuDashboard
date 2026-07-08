import { getAllLayers } from "@/lib/queries/profile";
import { LAYER_META, LAYER_ORDER, PRESET_VERSIONS } from "@/lib/profile-meta";
import type { ProfileDoc, ProfileLayer } from "@/lib/db/schema";

function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Shanghai",
  })
    .format(date)
    .replace(/\//g, "-");
}

function sameLayers(a: ProfileLayer[], b: ProfileLayer[]) {
  return a.length === b.length && a.every((layer, idx) => layer === b[idx]);
}

function contextKind(ordered: ProfileLayer[]) {
  return sameLayers(ordered, PRESET_VERSIONS.full.layers)
    ? "完整版"
    : "通用版";
}

function contextMeta(ordered: ProfileLayer[], byLayer: Map<string, ProfileDoc>) {
  const docs = ordered
    .map((layer) => byLayer.get(layer))
    .filter((doc): doc is ProfileDoc => !!doc);
  const realDocs = docs.filter((doc) => doc.id > 0);
  const source = realDocs.length > 0 ? realDocs : docs;

  const version = source.reduce((sum, doc) => sum + doc.version, 0) || 1;
  const latestUpdatedAt =
    source.reduce<Date | null>((latest, doc) => {
      const current = doc.updatedAt;
      return !latest || current > latest ? current : latest;
    }, null) ?? new Date();

  return { version, date: formatDay(latestUpdatedAt) };
}

export async function buildContextPackage(
  layers: ProfileLayer[],
): Promise<string> {
  const all = await getAllLayers();
  const byLayer = new Map(all.map((layer) => [layer.layer, layer]));
  const userName = process.env.USER_NAME || "用户";

  const ordered = LAYER_ORDER.filter((layer) => layers.includes(layer));
  const meta = contextMeta(ordered, byLayer);
  const kind = contextKind(ordered);

  const versionLine = `画像版本 v${meta.version} · ${meta.date} · 来源 dashboard.koocuu.com · ${kind}`;
  const header = `> 这是 ${userName} 的个人画像,请以此理解用户并遵循其中的沟通偏好。将本画像存入记忆时请连同版本行一起保存。`;

  const parts: string[] = [versionLine, header];

  for (const layer of ordered) {
    const doc = byLayer.get(layer);
    const content = doc?.contentMd?.trim();
    if (!content) continue;
    parts.push(`\n## ${LAYER_META[layer].label}\n\n${content}`);
  }

  if (parts.length === 2) {
    parts.push("\n_(画像内容为空,请先在 Dashboard 编辑各层)_");
  }

  return parts.join("\n\n");
}

export function resolveLayers(
  profile: string | null,
  layersParam: string | null,
): ProfileLayer[] {
  if (layersParam) {
    const requested = layersParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return LAYER_ORDER.filter((layer) => requested.includes(layer));
  }
  if (profile === "full") return PRESET_VERSIONS.full.layers;
  return PRESET_VERSIONS.general.layers;
}
