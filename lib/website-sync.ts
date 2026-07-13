/**
 * Sync the public profile layer to the personal website repo.
 * Uses a dedicated GitHub token/repo (not the daily backup credentials).
 * Writes via Contents API (single-file PUT) — friendlier for fine-grained PATs
 * than the Git Data /git/trees flow.
 */

const API = "https://api.github.com";

/** Default path inside the website repo. Keep in sync with cu-site. */
export const WEBSITE_NOW_PATH = "src/data/now/current.md";

export function isWebsiteSyncConfigured() {
  return Boolean(
    process.env.GITHUB_WEBSITE_TOKEN?.trim() &&
      process.env.GITHUB_WEBSITE_REPO?.trim(),
  );
}

export type WebsiteSyncResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

/**
 * Commit public-layer markdown to the website repo.
 * Content should be the full file (frontmatter + ## sections).
 */
export async function syncPublicLayerToWebsite(
  contentMd: string,
): Promise<WebsiteSyncResult> {
  const token = process.env.GITHUB_WEBSITE_TOKEN?.trim();
  const repo = process.env.GITHUB_WEBSITE_REPO?.trim();
  const branch = process.env.GITHUB_WEBSITE_BRANCH?.trim() || "main";
  const path = process.env.GITHUB_WEBSITE_PATH?.trim() || WEBSITE_NOW_PATH;

  if (!token || !repo) {
    return {
      ok: false,
      error:
        "未配置 GITHUB_WEBSITE_TOKEN / GITHUB_WEBSITE_REPO，无法同步到网站。画像层已保存。",
    };
  }

  const content = contentMd.replace(/\r\n/g, "\n").trimEnd() + "\n";

  try {
    await upsertFileViaContentsApi({
      token,
      repo,
      branch,
      path,
      content,
      message: "content: sync /now from Console public layer",
    });
    return { ok: true, path };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `网站同步失败：${error.message}。画像层已保存。`
          : "网站同步失败。画像层已保存。",
    };
  }
}

function toBase64(text: string): string {
  return Buffer.from(text, "utf8").toString("base64");
}

async function upsertFileViaContentsApi(opts: {
  token: string;
  repo: string;
  branch: string;
  path: string;
  content: string;
  message: string;
}) {
  const { token, repo, branch, path, content, message } = opts;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const encodedPath = path
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");

  // Current file SHA is required when updating an existing path.
  let sha: string | undefined;
  const getRes = await fetch(
    `${API}/repos/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    { headers },
  );
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string };
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    const body = await getRes.text();
    throw new Error(`GitHub GET contents ${getRes.status}: ${body}`);
  }

  const putRes = await fetch(`${API}/repos/${repo}/contents/${encodedPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message,
      content: toBase64(content),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(
      `GitHub PUT contents ${putRes.status} (${repo}@${branch}:${path}): ${body}`,
    );
  }
}
