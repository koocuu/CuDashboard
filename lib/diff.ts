export type DiffLine = {
  type: "same" | "add" | "del";
  text: string;
};

/**
 * 简单的逐行 LCS diff,用于画像提案的 diff 视图。
 * 数据量小(单层 Markdown),朴素 O(n*m) DP 足够。
 */
export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;

  // LCS 长度表
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "del", text: a[i] });
      i++;
    } else {
      result.push({ type: "add", text: b[j] });
      j++;
    }
  }
  while (i < n) result.push({ type: "del", text: a[i++] });
  while (j < m) result.push({ type: "add", text: b[j++] });

  return result;
}

/** 生成一句话 diff 摘要(+X 行 / -Y 行)。 */
export function diffSummary(oldText: string, newText: string): string {
  const diff = lineDiff(oldText, newText);
  const add = diff.filter((d) => d.type === "add").length;
  const del = diff.filter((d) => d.type === "del").length;
  return `+${add} 行 / -${del} 行`;
}
