import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  profileDoc,
  profileProposals,
  profileVersions,
  PROFILE_LAYERS,
  type ProfileLayer,
} from "@/lib/db/schema";
import { LAYER_ORDER } from "@/lib/profile-meta";

/** 读取全部画像层(缺失的层补空)。 */
export async function getAllLayers() {
  const rows = await db.select().from(profileDoc);
  const byLayer = new Map(rows.map((r) => [r.layer, r]));
  return LAYER_ORDER.map((layer) => {
    const existing = byLayer.get(layer);
    return (
      existing ?? {
        id: -1,
        layer,
        contentMd: "",
        version: 1,
        updatedAt: new Date(),
      }
    );
  });
}

/** 读取单层内容(不存在返回空字符串)。 */
export async function getLayer(layer: ProfileLayer): Promise<string> {
  const rows = await db
    .select()
    .from(profileDoc)
    .where(eq(profileDoc.layer, layer))
    .limit(1);
  return rows[0]?.contentMd ?? "";
}

/** 保存单层(用户直接编辑,不走 proposal)。upsert + version+1。 */
export async function saveLayer(layer: ProfileLayer, contentMd: string) {
  const rows = await db
    .select()
    .from(profileDoc)
    .where(eq(profileDoc.layer, layer))
    .limit(1);
  const existing = rows[0];

  if (!existing) {
    const [created] = await db
      .insert(profileDoc)
      .values({ layer, contentMd, version: 1, updatedAt: new Date() })
      .returning();
    return created;
  }

  // 归档旧版
  await db.insert(profileVersions).values({
    layer,
    contentMd: existing.contentMd,
    version: existing.version,
  });

  const [updated] = await db
    .update(profileDoc)
    .set({
      contentMd,
      version: existing.version + 1,
      updatedAt: new Date(),
    })
    .where(eq(profileDoc.layer, layer))
    .returning();
  return updated;
}

/** 待处理提案数量(首页角标)。 */
export async function pendingProposalCount(): Promise<number> {
  const rows = await db
    .select({ id: profileProposals.id })
    .from(profileProposals)
    .where(eq(profileProposals.status, "pending"));
  return rows.length;
}

export async function listProposals() {
  return db
    .select()
    .from(profileProposals)
    .orderBy(desc(profileProposals.createdAt));
}

export async function getVersions(layer: ProfileLayer) {
  return db
    .select()
    .from(profileVersions)
    .where(eq(profileVersions.layer, layer))
    .orderBy(desc(profileVersions.version));
}

export function isValidLayer(v: string): v is ProfileLayer {
  return (PROFILE_LAYERS as readonly string[]).includes(v);
}
