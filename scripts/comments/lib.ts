/**
 * Shared helpers for the comment system: store IO (local or via SSH to Mozek),
 * Substack JSON fetching with fallbacks, and HTML/text utilities.
 *
 * Env overrides (used for local prototyping — Substack and the server are
 * unreachable from the dev sandbox):
 *  - COMMENTS_STORE_LOCAL=/path/store.json   read/write the store locally, no scp
 *  - COMMENTS_INSIGHTS_LOCAL=/path/insights.json
 *  - COMMENTS_NO_SSH=1                       skip the ssh-curl fetch strategy
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyStore, type CommentStore, type InsightsFile } from './types.ts';

export const SERVER = 'root@77.42.84.152';
export const STORE_REMOTE = '/root/comments-data/store.json';
export const INSIGHTS_REMOTE = '/root/comments-data/insights.json';
export const SUBSTACK = 'https://davidnavratil.substack.com';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// ----- generic remote JSON file IO (atomic writes, .prev backup) -----

function scratchDir(): string {
  return mkdtempSync(join(tmpdir(), 'comments-'));
}

function loadRemoteJson(remotePath: string): unknown | null {
  const local = join(scratchDir(), 'download.json');
  try {
    execFileSync('scp', ['-q', `${SERVER}:${remotePath}`, local], { stdio: 'pipe' });
  } catch {
    return null; // first run — file does not exist yet
  }
  return JSON.parse(readFileSync(local, 'utf-8'));
}

function saveRemoteJson(remotePath: string, data: unknown): void {
  const local = join(scratchDir(), 'upload.json');
  writeFileSync(local, JSON.stringify(data, null, 2));
  const tmp = `${remotePath}.tmp`;
  const dir = remotePath.slice(0, remotePath.lastIndexOf('/'));
  execFileSync('ssh', [SERVER, `mkdir -p ${dir}`], { stdio: 'pipe' });
  execFileSync('scp', ['-q', local, `${SERVER}:${tmp}`], { stdio: 'pipe' });
  // Atomic swap: keep the previous version as .prev, then rename .tmp into place.
  execFileSync(
    'ssh',
    [SERVER, `if [ -f ${remotePath} ]; then cp -f ${remotePath} ${remotePath}.prev; fi && mv -f ${tmp} ${remotePath}`],
    { stdio: 'pipe' },
  );
}

// ----- store -----

export function loadStore(): CommentStore {
  const localPath = process.env.COMMENTS_STORE_LOCAL;
  if (localPath) {
    if (!existsSync(localPath)) return emptyStore();
    return JSON.parse(readFileSync(localPath, 'utf-8')) as CommentStore;
  }
  const data = loadRemoteJson(STORE_REMOTE);
  return data ? (data as CommentStore) : emptyStore();
}

export function saveStore(store: CommentStore): void {
  store.updated_at = new Date().toISOString();
  const localPath = process.env.COMMENTS_STORE_LOCAL;
  if (localPath) {
    writeFileSync(localPath, JSON.stringify(store, null, 2));
    return;
  }
  saveRemoteJson(STORE_REMOTE, store);
}

export function loadInsights(): InsightsFile {
  const localPath = process.env.COMMENTS_INSIGHTS_LOCAL;
  const data = localPath
    ? existsSync(localPath)
      ? JSON.parse(readFileSync(localPath, 'utf-8'))
      : null
    : loadRemoteJson(INSIGHTS_REMOTE);
  return data ? (data as InsightsFile) : { version: 1, runs: [] };
}

export function saveInsights(insights: InsightsFile): void {
  const localPath = process.env.COMMENTS_INSIGHTS_LOCAL;
  if (localPath) {
    writeFileSync(localPath, JSON.stringify(insights, null, 2));
    return;
  }
  saveRemoteJson(INSIGHTS_REMOTE, insights);
}

// ----- Substack JSON fetch with fallbacks -----
//
// Strategy 1: curl via SSH from Mozek — the server IP is proven to pass
//             Substack's bot protection (see scripts/update-rss-cache.mjs),
//             GitHub Actions runner IPs often do not.
// Strategy 2: native fetch from this machine.
// Total failure throws — the workflow must alert, never silently succeed.

export async function fetchSubstackJson(url: string): Promise<unknown> {
  const errors: string[] = [];

  if (process.env.COMMENTS_NO_SSH !== '1') {
    try {
      const out = execFileSync('ssh', [SERVER, `curl -sf --max-time 30 -A '${UA}' '${url}'`], {
        encoding: 'utf-8',
        maxBuffer: 32 * 1024 * 1024,
      });
      return JSON.parse(out);
    } catch (err) {
      errors.push(`ssh-curl: ${(err as Error).message.slice(0, 200)}`);
    }
  }

  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    errors.push(`fetch: ${(err as Error).message.slice(0, 200)}`);
  }

  throw new Error(`Substack fetch failed for ${url}:\n  ${errors.join('\n  ')}`);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ----- HTML / text utilities -----

/** Escape untrusted text for HTML text and attribute contexts. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Allow only http(s) URLs from untrusted sources; anything else renders as '#'. */
export function safeUrl(url: string | undefined): string {
  if (!url) return '#';
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : '#';
}

/** Truncate to a maximum length, appending an ellipsis when cut. */
export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}
