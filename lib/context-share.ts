import { verifyShareSlug } from "@/lib/auth/tokens";
import { buildContextPackage } from "@/lib/context-builder";
import { PRESET_VERSIONS } from "@/lib/profile-meta";

export type SharedProfileVersion = "general" | "full";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function htmlShell(markdown: string, version: SharedProfileVersion) {
  const title =
    version === "full" ? "Console Profile Context Full" : "Console Profile Context";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #FAF7F1;
      --card: #FFFFFF;
      --text: #1E222A;
      --muted: #8A8880;
      --line: #E6E5E0;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.7;
    }
    main {
      max-width: 880px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }
    .meta {
      margin-bottom: 16px;
      color: var(--muted);
      font-family: "JetBrains Mono", "IBM Plex Mono", ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 12px;
      letter-spacing: 0.04em;
    }
    pre {
      margin: 0;
      padding: 20px;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--card);
      color: var(--text);
      font: inherit;
    }
  </style>
</head>
<body>
  <main>
    <div class="meta">CONSOLE CONTEXT · ${version.toUpperCase()}</div>
    <pre>${escapeHtml(markdown)}</pre>
  </main>
</body>
</html>`;
}

export async function buildSharedContextHtml(
  slug: string,
  version: SharedProfileVersion,
) {
  const auth = await verifyShareSlug(slug);
  if (!auth) return null;

  const layers = PRESET_VERSIONS[version].layers;
  const markdown = await buildContextPackage(layers);
  return htmlShell(markdown, version);
}

export function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
