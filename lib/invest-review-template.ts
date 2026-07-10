import { z } from "zod";

export const monthlyReviewDataSchema = z.object({
  conclusion: z.string().trim().min(8).max(6000).describe("本月方向、结构与最终裁决"),
  triggers_and_rules: z.string().trim().min(8).max(6000).describe("触发线、约束和立即生效的纪律"),
  actions: z.string().trim().min(8).max(6000).describe("本月实际动作；建议和已执行必须明确区分"),
  next_month_checks: z.string().trim().min(8).max(6000).describe("下月需要核验的数据、事件和不确定性"),
});

export type MonthlyReviewData = z.infer<typeof monthlyReviewDataSchema>;

export function renderMonthlyReview(month: string, input: unknown) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("月份格式必须为 YYYY-MM");
  }
  const data = monthlyReviewDataSchema.parse(input);
  return `# ${month} 月度审计

## 本月结论
${data.conclusion}

## 触发与纪律
${data.triggers_and_rules}

## 本月动作
${data.actions}

## 下月核验
${data.next_month_checks}
`;
}

export function validateMonthlyReview(month: string, contentMd: string) {
  const content = contentMd.replace(/\r\n/g, "\n").trim();
  const sectionNames = ["本月结论", "触发与纪律", "本月动作", "下月核验"];
  if (!content.startsWith(`# ${month} 月度审计`)) {
    return { ok: false as const, error: `标题必须为“# ${month} 月度审计”` };
  }
  const headings = [...content.matchAll(/^##\s+(.+)\s*$/gm)].map((match) => ({
    name: match[1].trim(),
    index: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  let previous = -1;
  for (const name of sectionNames) {
    const index = headings.findIndex((heading) => heading.name === name);
    if (index < 0 || index <= previous) {
      return { ok: false as const, error: `缺少或错序的段落“${name}”` };
    }
    const end = headings[index + 1]?.index ?? content.length;
    if (content.slice(headings[index].end, end).trim().length < 8) {
      return { ok: false as const, error: `“${name}”内容过短` };
    }
    previous = index;
  }
  return { ok: true as const };
}
