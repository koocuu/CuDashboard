/**
 * Sync the public profile layer to the personal website repo.
 * Uses a dedicated GitHub token/repo (not the daily backup credentials).
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
    await commitSingleFile({
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

async function commitSingleFile(opts: {
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

  const gh = async (apiPath: string, init?: RequestInit) => {
    const res = await fetch(`${API}/repos/${repo}${apiPath}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub ${apiPath} ${res.status}: ${body}`);
    }
    return res.json();
  };

  const ref = await gh(`/git/ref/heads/${branch}`);
  const baseCommitSha = ref.object.sha as string;
  const baseCommit = await gh(`/git/commits/${baseCommitSha}`);
  const baseTreeSha = baseCommit.tree.sha as string;

  const tree = await gh(`/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [
        {
          path,
          mode: "100644",
          type: "blob",
          content,
        },
      ],
    }),
  });

  const commit = await gh(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [baseCommitSha],
    }),
  });

  await gh(`/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });
}
