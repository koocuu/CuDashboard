import Link from "next/link";
import { listProposals } from "@/lib/queries/profile";
import { LAYER_META } from "@/lib/profile-meta";
import { formatDate } from "@/lib/utils";
import type { ProfileLayer } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "待确认", cls: "text-primary" },
  approved: { text: "已合并", cls: "text-positive" },
  rejected: { text: "已拒绝", cls: "text-muted-foreground" },
};

export default async function ProposalsPage() {
  const proposals = await listProposals();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/profile" className="text-sm text-muted-foreground">
          ← 画像
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">画像提案</h1>
      </div>

      {proposals.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          还没有提案。AI 可通过 API / 粘贴更新块 / MCP 提交。
        </p>
      )}

      <div className="space-y-2">
        {proposals.map((p) => {
          const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pending;
          return (
            <Link
              key={p.id}
              href={`/profile/proposals/${p.id}`}
              className="block border-b border-border py-3 transition-colors hover:text-foreground"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {LAYER_META[p.layer as ProfileLayer]?.label ?? p.layer}
                </span>
                <span className={`text-xs font-medium ${st.cls}`}>
                  {st.text}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {p.diffSummary}
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                {p.source} · {p.sourceName || "—"} · {formatDate(p.createdAt)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
