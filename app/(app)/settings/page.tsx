import { McpInfo } from "@/components/settings/mcp-info";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">设置</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">MCP Server</h2>
        <McpInfo />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">数据</h2>
        <div className="flex flex-col gap-2 text-sm">
          <a
            href="/profile/tokens"
            className="rounded-lg border bg-card px-3 py-2 hover:bg-muted/50"
          >
            API Token 管理 →
          </a>
        </div>
      </section>
    </div>
  );
}
