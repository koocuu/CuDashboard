const REQUIRED_SECTIONS = ["本月结论", "触发与纪律", "本月动作", "下月核验"] as const;

export type ReviewValidation =
  | { ok: true }
  | { ok: false; error: string };

export function monthlyReviewTemplate(month: string) {
  return `# ${month} 月度审计

## 本月结论

## 触发与纪律

## 本月动作

## 下月核验
`;
}

/**
 * 月度审计是可横向比较的历史档案，保留一套固定骨架。
 * 快照由服务端附在 metadata 中，不要求用户重复填写数字。
 */
export function validateMonthlyReview(
  month: string,
  contentMd: string,
): ReviewValidation {
  const content = contentMd.replace(/\r\n/g, "\n").trim();
  const title = `# ${month} 月度审计`;
  if (!content.startsWith(title)) {
    return { ok: false, error: `标题必须为“${title}”` };
  }

  const headings = [...content.matchAll(/^##\s+(.+)\s*$/gm)].map((match) => ({
    name: match[1].trim(),
    index: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));

  let previous = -1;
  for (const section of REQUIRED_SECTIONS) {
    const index = headings.findIndex((heading) => heading.name === section);
    if (index < 0) {
      return { ok: false, error: `缺少必填段落“${section}”` };
    }
    if (index <= previous) {
      return { ok: false, error: "必填段落顺序不正确" };
    }

    const start = headings[index].end;
    const end = headings[index + 1]?.index ?? content.length;
    const body = content.slice(start, end).trim();
    if (body.replace(/[\s#>*_`-]/g, "").length < 8) {
      return { ok: false, error: `“${section}”内容过短，请补充具体判断` };
    }
    previous = index;
  }

  return { ok: true };
}

