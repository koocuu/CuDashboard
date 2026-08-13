import "dotenv/config";
import { isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, type ProjectArea } from "@/lib/db/schema";

const seed: Array<{
  name: string;
  slug: string;
  area: ProjectArea;
  summary: string;
  url: string;
  repoUrl: string;
  skillRef: string;
  sortOrder: number;
}> = [
  {
    name: "捋捋",
    slug: "lulu",
    area: "personal",
    summary:
      "脑内倾倒与思维整理：把 todo、情绪、纠结倒进输入框，AI 分拣成可交互关系图。",
    url: "https://mind.koocuu.com/",
    repoUrl: "https://github.com/koocuu/lvlvMind",
    skillRef: "",
    sortOrder: 10,
  },
  {
    name: "决策助手",
    slug: "decision-assistant",
    area: "personal",
    summary: "把一段纠结拆成选项、风险和低后悔行动，事后复盘沉淀决策。",
    url: "https://koocuu.com/zh/projects/decision-assistant/",
    repoUrl: "",
    skillRef: "",
    sortOrder: 20,
  },
  {
    name: "选本共创",
    slug: "cocreation",
    area: "work",
    summary: "内容方上传剧本、承制方挑选的内部共创平台。",
    url: "https://cocreation.iqiyi.com",
    repoUrl: "",
    skillRef: "",
    sortOrder: 30,
  },
  {
    name: "koocuu.com",
    slug: "koocuu-site",
    area: "personal",
    summary: "个人站：项目、关于、公开近况。",
    url: "https://koocuu.com/zh/",
    repoUrl: "",
    skillRef: "",
    sortOrder: 40,
  },
  {
    name: "Console",
    slug: "console",
    area: "personal",
    summary: "个人画像 RAG + 人生状态工作台。给 AI 读，给人确认。",
    url: "https://dashboard.koocuu.com",
    repoUrl: "https://github.com/koocuu/CuDashboard",
    skillRef: "",
    sortOrder: 50,
  },
  {
    name: "topic-radar",
    slug: "topic-radar",
    area: "writing",
    summary: "公众号选题雷达。供稿机器，灵感来了再翻，不进每日主场。",
    url: "",
    repoUrl: "",
    skillRef: "",
    sortOrder: 60,
  },
];

async function main() {
  const existing = await db
    .select({ slug: projects.slug })
    .from(projects)
    .where(isNull(projects.deletedAt));
  const have = new Set(existing.map((row) => row.slug));
  let inserted = 0;

  for (const item of seed) {
    if (have.has(item.slug)) continue;
    await db.insert(projects).values(item);
    inserted += 1;
    console.log(`+ ${item.slug}`);
  }

  console.log(`✓ 作品墙种子：新增 ${inserted}，已有 ${have.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
