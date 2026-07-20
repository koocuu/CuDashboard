/**
 * 画像层结构重组迁移（一次性）：
 * - creative → core 末尾（## 创作）
 * - milestones「投资故事」→ investing 末尾（## 投资历程）
 * - milestones「情感成长」→ private 末尾（保留 ## 情感成长）
 * - private 行改名为 relationship
 * - status = ## 内部状态 + 旧 status；## 公开状态 + 旧 public
 * - 删除 creative / milestones / public
 *
 * 用法: npx tsx scripts/migrate-profile-layers-v3.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileDoc, profileVersions } from "@/lib/db/schema";
import { buildStatusLayerContent } from "@/lib/status-sections";

function extractH2Section(content: string, title: string): string {
  const text = content.replace(/\r\n/g, "\n");
  const re = new RegExp(
    `^##\\s+${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
    "m",
  );
  const match = re.exec(text);
  if (!match || match.index === undefined) return "";
  const start = match.index + match[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^##\s+/m);
  return (next < 0 ? rest : rest.slice(0, next)).replace(/^\n+/, "").trim();
}

function appendSection(base: string, heading: string, body: string) {
  const trimmedBase = base.replace(/\r\n/g, "\n").trimEnd();
  const trimmedBody = body.replace(/\r\n/g, "\n").trim();
  if (!trimmedBody) return trimmedBase ? `${trimmedBase}\n` : "";
  const block = heading ? `## ${heading}\n\n${trimmedBody}` : trimmedBody;
  return trimmedBase ? `${trimmedBase}\n\n${block}\n` : `${block}\n`;
}

async function getLayer(layer: string) {
  const rows = await db
    .select()
    .from(profileDoc)
    .where(eq(profileDoc.layer, layer))
    .limit(1);
  return rows[0] ?? null;
}

async function archiveAndSave(layer: string, contentMd: string, existing: typeof profileDoc.$inferSelect | null) {
  if (existing) {
    await db.insert(profileVersions).values({
      layer,
      contentMd: existing.contentMd,
      version: existing.version,
    });
    await db
      .update(profileDoc)
      .set({
        contentMd,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(profileDoc.id, existing.id));
    return;
  }
  await db.insert(profileDoc).values({
    layer,
    contentMd,
    version: 1,
    updatedAt: new Date(),
  });
}

async function deleteLayer(layer: string) {
  const row = await getLayer(layer);
  if (!row) return;
  await db.insert(profileVersions).values({
    layer,
    contentMd: row.contentMd,
    version: row.version,
  });
  await db.delete(profileDoc).where(eq(profileDoc.id, row.id));
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const core = await getLayer("core");
  const creative = await getLayer("creative");
  const investing = await getLayer("investing");
  const milestones = await getLayer("milestones");
  const privateLayer = await getLayer("private");
  const relationshipExisting = await getLayer("relationship");
  const status = await getLayer("status");
  const publicLayer = await getLayer("public");

  // 幂等：若已有 relationship 且无 private/creative/milestones/public，视为已迁移
  if (
    relationshipExisting &&
    !privateLayer &&
    !creative &&
    !milestones &&
    !publicLayer &&
    status?.contentMd.includes("## 内部状态")
  ) {
    console.log("✓ already migrated (relationship present, legacy layers gone)");
    return;
  }

  // 1) creative → core
  let nextCore = core?.contentMd ?? "";
  if (creative?.contentMd.trim()) {
    nextCore = appendSection(nextCore, "创作", creative.contentMd.trim());
  }

  // 2) milestones split
  let nextInvesting = investing?.contentMd ?? "";
  let nextPrivate = privateLayer?.contentMd ?? relationshipExisting?.contentMd ?? "";
  if (milestones?.contentMd.trim()) {
    const investStory = extractH2Section(milestones.contentMd, "投资故事");
    const emotionGrowth = extractH2Section(milestones.contentMd, "情感成长");
    if (investStory) {
      nextInvesting = appendSection(nextInvesting, "投资历程", investStory);
    }
    if (emotionGrowth) {
      nextPrivate = appendSection(nextPrivate, "情感成长", emotionGrowth);
    }
    if (!investStory && !emotionGrowth) {
      throw new Error("milestones 存在但未找到「投资故事」或「情感成长」二级标题");
    }
  }

  // 3) status = 内部 + 公开
  const alreadySplit = (status?.contentMd ?? "").includes("## 内部状态");
  let nextStatus = status?.contentMd ?? "";
  if (!alreadySplit) {
    const internal = (status?.contentMd ?? "").trim();
    const publicBody = (publicLayer?.contentMd ?? "").trim();
    nextStatus = buildStatusLayerContent(internal, publicBody);
  } else if (publicLayer?.contentMd.trim() && !nextStatus.includes("## 公开状态")) {
    nextStatus = buildStatusLayerContent(
      extractH2Section(nextStatus, "内部状态") || nextStatus,
      publicLayer.contentMd.trim(),
    );
  }

  // Write merged layers
  await archiveAndSave("core", nextCore.endsWith("\n") ? nextCore : `${nextCore}\n`, core);
  await archiveAndSave(
    "investing",
    nextInvesting.endsWith("\n") ? nextInvesting : `${nextInvesting}\n`,
    investing,
  );
  await archiveAndSave(
    "status",
    nextStatus.endsWith("\n") ? nextStatus : `${nextStatus}\n`,
    status,
  );

  // 4) private → relationship
  if (relationshipExisting) {
    await archiveAndSave(
      "relationship",
      nextPrivate.endsWith("\n") ? nextPrivate : `${nextPrivate}\n`,
      relationshipExisting,
    );
    if (privateLayer) await deleteLayer("private");
  } else if (privateLayer) {
    await db.insert(profileVersions).values({
      layer: "private",
      contentMd: privateLayer.contentMd,
      version: privateLayer.version,
    });
    await db
      .update(profileDoc)
      .set({
        layer: "relationship",
        contentMd: nextPrivate.endsWith("\n") ? nextPrivate : `${nextPrivate}\n`,
        version: privateLayer.version + 1,
        updatedAt: new Date(),
      })
      .where(eq(profileDoc.id, privateLayer.id));
  } else {
    await archiveAndSave(
      "relationship",
      nextPrivate.endsWith("\n") ? nextPrivate : `${nextPrivate}\n`,
      null,
    );
  }

  // 5) drop legacy layers
  await deleteLayer("creative");
  await deleteLayer("milestones");
  await deleteLayer("public");

  const rows = await db.select({ layer: profileDoc.layer, chars: profileDoc.contentMd }).from(profileDoc);
  console.log(
    "✓ migrated layers:",
    rows.map((r) => `${r.layer}(${r.chars.length})`).join(", "),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
