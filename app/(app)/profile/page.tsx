import Link from "next/link";
import { DistributionPanel } from "@/components/profile/distribution-panel";
import { PasteImport } from "@/components/profile/paste-import";
import { ProfileEditor } from "@/components/profile/profile-editor";
import { LAYER_META, LAYER_ORDER } from "@/lib/profile-meta";
import { getAllLayers, listProposals } from "@/lib/queries/profile";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [layers, proposals] = await Promise.all([
    getAllLayers(),
    listProposals(),
  ]);
  const pending = proposals.filter((p) => p.status === "pending");
  const layerMap = new Map(layers.map((l) => [l.layer, l]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">AI 画像</h1>
        <Link
          href="/profile/tokens"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Token 管理 →
        </Link>
      </div>

      {pending.length > 0 && (
        <Link
          href="/profile/proposals"
          className="block rounded-xl border border-primary/40 bg-[#FBE7E1] p-3 text-sm"
        >
          <span className="font-mono text-xs font-medium text-primary">
            待确认 · {String(pending.length).padStart(2, "0")}
          </span>
          <span className="ml-2 text-muted-foreground">点击查看 diff →</span>
        </Link>
      )}

      <DistributionPanel />
      <PasteImport />

      <section className="space-y-4">
        <h2 className="text-sm font-normal text-muted-foreground">画像分层</h2>
        {LAYER_ORDER.map((layer) => {
          const doc = layerMap.get(layer)!;
          return (
            <ProfileEditor
              key={layer}
              layer={layer}
              meta={LAYER_META[layer]}
              initialContent={doc.contentMd}
              version={doc.version}
            />
          );
        })}
      </section>

      <div className="flex gap-4 pt-2 text-sm text-muted-foreground">
        <Link href="/profile/proposals" className="hover:text-foreground">
          全部提案记录
        </Link>
      </div>
    </div>
  );
}
