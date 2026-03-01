import type { GitHubCommit, CommitFileChange } from '../types.js';

const GITHUB_API = 'https://api.github.com';

export interface CommitWithFiles {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  url: string;
  files: CommitFileChange[];
}

export async function fetchRecentCommits(
  repo: string,
  branch: string = 'main',
  since?: string,
  token?: string
): Promise<GitHubCommit[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const sinceParam = since ? `&since=${since}` : '';
  const url = `${GITHUB_API}/repos/${repo}/commits?sha=${branch}&per_page=10${sinceParam}`;

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`);
    }
    const data = await res.json();

    return data.map((c: { sha: string; commit: { message: string; author: { name: string; date: string } }; html_url: string }) => ({
      sha: c.sha.substring(0, 7),
      message: c.commit.message.split('\n')[0],
      author: c.commit.author?.name ?? 'Unknown',
      timestamp: c.commit.author?.date ?? '',
      url: c.html_url ?? `https://github.com/${repo}/commit/${c.sha}`,
    }));
  } catch (err) {
    console.error('GitHub fetch error:', err);
    return [];
  }
}

/**
 * Fetches a single commit with file changes (diffs) for root cause analysis.
 */
export async function fetchCommitWithFiles(
  repo: string,
  sha: string,
  token?: string
): Promise<CommitWithFiles | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${GITHUB_API}/repos/${repo}/commits/${sha}`, {
      headers,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      sha: string;
      commit: { message: string; author?: { name?: string; date?: string } };
      html_url: string;
      files?: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }>;
    };

    return {
      sha: data.sha.substring(0, 7),
      message: data.commit.message.split('\n')[0],
      author: data.commit.author?.name ?? 'Unknown',
      timestamp: data.commit.author?.date ?? '',
      url: data.html_url ?? `https://github.com/${repo}/commit/${data.sha}`,
      files: (data.files ?? []).map((f) => ({
        filename: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions,
        patch: f.patch,
      })),
    };
  } catch (err) {
    console.error('GitHub commit fetch error:', err);
    return null;
  }
}
