const API = "https://api.github.com";

interface FileEntry {
  path: string;
  content: string;
}

/**
 * 把一组文件作为单个 commit 推送到私有仓库(GitHub Git Data API)。
 * 需要 GITHUB_BACKUP_TOKEN(repo 写权限)、GITHUB_BACKUP_REPO(owner/repo)。
 */
export async function commitFiles(
  files: FileEntry[],
  message: string,
): Promise<void> {
  const token = process.env.GITHUB_BACKUP_TOKEN;
  const repo = process.env.GITHUB_BACKUP_REPO;
  const branch = process.env.GITHUB_BACKUP_BRANCH || "main";
  if (!token || !repo) {
    throw new Error("未配置 GITHUB_BACKUP_TOKEN / GITHUB_BACKUP_REPO");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  const gh = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${API}/repos/${repo}${path}`, {
      ...init,
      headers,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`GitHub ${path} ${res.status}: ${body}`);
    }
    return res.json();
  };

  // 1. 当前分支最新 commit
  const ref = await gh(`/git/ref/heads/${branch}`);
  const baseCommitSha = ref.object.sha;
  const baseCommit = await gh(`/git/commits/${baseCommitSha}`);
  const baseTreeSha = baseCommit.tree.sha;

  // 2. 新 tree(content 内联,GitHub 自动建 blob)
  const tree = await gh(`/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: files.map((f) => ({
        path: f.path,
        mode: "100644",
        type: "blob",
        content: f.content,
      })),
    }),
  });

  // 3. 新 commit
  const commit = await gh(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [baseCommitSha],
    }),
  });

  // 4. 移动分支指针
  await gh(`/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha }),
  });
}
