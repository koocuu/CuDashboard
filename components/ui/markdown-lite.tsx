function inline(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

export function MarkdownLite({ content }: { content: string }) {
  const lines = content.trim().split(/\r?\n/);
  if (!content.trim()) {
    return (
      <p className="text-sm text-muted-foreground">
        还没有近期状态。去画像页填写 status 层，或让 AI 提交更新提案。
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm leading-6">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;
        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={i} className="pt-1 text-sm font-semibold">
              {trimmed.slice(4)}
            </h3>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-1 text-base font-semibold">
              {trimmed.slice(3)}
            </h2>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={i} className="text-base font-semibold">
              {trimmed.slice(2)}
            </h2>
          );
        }
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <p
              key={i}
              className="pl-3 before:mr-2 before:content-['-']"
              dangerouslySetInnerHTML={{ __html: inline(trimmed.slice(2)) }}
            />
          );
        }
        return (
          <p
            key={i}
            dangerouslySetInnerHTML={{ __html: inline(trimmed) }}
          />
        );
      })}
    </div>
  );
}
