/**
 * Weekly summary — produces a Telegram digest of activity on davidnavratil.com
 * and the current state of the analysis portfolio.
 *
 * Outputs: /tmp/weekly-summary.txt (Markdown for Telegram)
 *
 * Data sources:
 *  - gh CLI (GITHUB_TOKEN)          — commits, PRs, workflow runs, issues (davidnavratil.com only)
 *  - src/data/analyses.ts           — portfolio status snapshot
 *  - src/data/articles-cache.json   — Substack articles
 *  - live HTTP probes               — URL/image health
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { analyses, getHref, type Analysis } from '../../src/data/analyses.ts';

const DOMAIN = 'https://davidnavratil.com';

// Cross-repo: analysis repos to include in per-repo activity section.
// Requires GH_PAT env (fine-grained PAT with Contents:Read + Metadata:Read across user repos).
const ANALYSIS_REPOS = [
  'opportunity-vs-threat',
  'trust-in-society',
  'cesta-nafty',
  'energy-shock-2022-vs-2026',
  'fertilizer-crisis',
  'hormuz-energy-simulator',
  'qatar-infrastructure',
  'ree-dashboard',
  'hormuz-simulator',
  'uzka-hrdla',
  'index-silnejsich-regionu',
];

const PAT = process.env.GH_PAT; // optional; when set, cross-repo section is included

async function ghApi<T>(endpoint: string, fallback: T): Promise<T> {
  if (!PAT) return fallback;
  try {
    const res = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        Authorization: `Bearer ${PAT}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

function daysAgoIso(d: number): string {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() - d);
  return t.toISOString();
}

function ghJSON<T>(cmd: string, fallback: T): T {
  try {
    const out = execSync(cmd, { encoding: 'utf-8' });
    return JSON.parse(out);
  } catch {
    return fallback;
  }
}

function weekCommits() {
  const since = daysAgoIso(7);
  return ghJSON<Array<{ sha: string; commit: { message: string; author: { date: string } } }>>(
    `gh api "repos/davidnavratil/davidnavratil.com/commits?since=${since}" 2>/dev/null`,
    [],
  );
}

function weekMergedPrs() {
  return ghJSON<Array<{ number: number; title: string; mergedAt: string; author: { login: string } }>>(
    `gh pr list --repo davidnavratil/davidnavratil.com --state merged --limit 20 --json number,title,mergedAt,author --jq "[.[] | select(.mergedAt > \\"${daysAgoIso(7)}\\")]" 2>/dev/null`,
    [],
  );
}

function weekClosedIssues() {
  return ghJSON<Array<{ number: number; title: string; closedAt: string; labels: { name: string }[] }>>(
    `gh issue list --repo davidnavratil/davidnavratil.com --state closed --limit 20 --json number,title,closedAt,labels --jq "[.[] | select(.closedAt > \\"${daysAgoIso(7)}\\")]" 2>/dev/null`,
    [],
  );
}

function weekWorkflowRuns(workflow: string) {
  return ghJSON<{ total_count: number; workflow_runs: Array<{ conclusion: string }> }>(
    `gh api "repos/davidnavratil/davidnavratil.com/actions/workflows/${workflow}/runs?created=>${daysAgoIso(7).slice(0, 10)}" 2>/dev/null`,
    { total_count: 0, workflow_runs: [] },
  );
}

function openAuditIssue() {
  const arr = ghJSON<Array<{ number: number; title: string; url: string }>>(
    'gh issue list --label audit --state open --limit 1 --json number,title,url 2>/dev/null',
    [],
  );
  return arr[0] ?? null;
}

function openPrs() {
  return ghJSON<Array<{ number: number; author: { login: string } }>>(
    'gh pr list --repo davidnavratil/davidnavratil.com --state open --json number,author 2>/dev/null',
    [],
  );
}

function weekArticles() {
  const path = 'src/data/articles-cache.json';
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const articles: any[] = Array.isArray(data) ? data : data.articles ?? [];
    const cutoff = new Date(daysAgoIso(7)).getTime();
    return articles.filter((a: any) => {
      const d = new Date(a.pubDate ?? a.date ?? 0).getTime();
      return d > cutoff;
    });
  } catch {
    return [];
  }
}

async function probeAll() {
  const results = await Promise.all(
    analyses.map(async (a) => {
      const href = getHref(a, 'cs');
      const url = href.startsWith('http') ? href : `${DOMAIN}${href}`;
      try {
        const r = await fetch(url, { method: 'HEAD', redirect: 'manual' });
        return { key: a.key, status: a.status ?? (a.live ? 'published' : 'drafting'), ok: r.status === 200 };
      } catch {
        return { key: a.key, status: a.status ?? (a.live ? 'published' : 'drafting'), ok: false };
      }
    }),
  );
  return results;
}

function weekRange(): string {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - 7);
  const fmt = (d: Date) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;
  return `${fmt(start)}–${fmt(end)}`;
}

type RepoActivity = {
  repo: string;
  commits: number;
  deploys: number;
  deploysFailed: number;
  lastPush: string | null; // ISO
  daysSincePush: number | null;
};

async function fetchRepoActivity(repo: string): Promise<RepoActivity> {
  const since = daysAgoIso(7);
  const [commitsData, runsData, repoData] = await Promise.all([
    ghApi<Array<unknown>>(`/repos/davidnavratil/${repo}/commits?since=${since}&per_page=100`, []),
    ghApi<{ workflow_runs: Array<{ conclusion: string; name: string }> }>(
      `/repos/davidnavratil/${repo}/actions/runs?created=>${since.slice(0, 10)}`,
      { workflow_runs: [] },
    ),
    ghApi<{ pushed_at: string | null }>(`/repos/davidnavratil/${repo}`, { pushed_at: null }),
  ]);

  const deployRuns = runsData.workflow_runs.filter((r) => (r.name || '').toLowerCase().includes('deploy'));
  const lastPush = repoData.pushed_at;
  const daysSincePush = lastPush
    ? Math.floor((Date.now() - new Date(lastPush).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    repo,
    commits: commitsData.length,
    deploys: deployRuns.filter((r) => r.conclusion === 'success').length,
    deploysFailed: deployRuns.filter((r) => r.conclusion === 'failure').length,
    lastPush,
    daysSincePush,
  };
}

async function main() {
  console.log('Building weekly summary...');

  const [commits, mergedPrs, closedIssues, deployRuns, auditRuns, dashboardRuns, auditIssue, openedPrs, articles, probes, repoActivities] =
    await Promise.all([
      Promise.resolve(weekCommits()),
      Promise.resolve(weekMergedPrs()),
      Promise.resolve(weekClosedIssues()),
      Promise.resolve(weekWorkflowRuns('deploy.yml')),
      Promise.resolve(weekWorkflowRuns('audit.yml')),
      Promise.resolve(weekWorkflowRuns('dashboard.yml')),
      Promise.resolve(openAuditIssue()),
      Promise.resolve(openPrs()),
      Promise.resolve(weekArticles()),
      probeAll(),
      PAT ? Promise.all(ANALYSIS_REPOS.map(fetchRepoActivity)) : Promise.resolve<RepoActivity[]>([]),
    ]);

  const published = analyses.filter((a) => (a.status ?? (a.live ? 'published' : 'drafting')) === 'published').length;
  const drafting = analyses.filter((a) => (a.status ?? (a.live ? 'published' : 'drafting')) === 'drafting').length;
  const research = analyses.filter((a) => a.status === 'research').length;
  const archived = analyses.filter((a) => a.status === 'archived').length;

  const brokenUrls = probes.filter((p) => !p.ok && p.status !== 'archived').map((p) => p.key);
  const deployFailed = deployRuns.workflow_runs.filter((r) => r.conclusion === 'failure').length;
  const deploySuccess = deployRuns.workflow_runs.filter((r) => r.conclusion === 'success').length;

  // Dependabot vs manual PRs
  const dependabotOpenCount = openedPrs.filter((p) => p.author.login === 'app/dependabot').length;

  const lines: string[] = [];
  lines.push(`📅 *Týdenní shrnutí — ${weekRange()}*`);
  lines.push('');

  // Portfolio snapshot
  lines.push('*📊 Portfolio*');
  lines.push(`• Publikované: ${published}  • Rozpracované: ${drafting}${research ? '  • Research: ' + research : ''}${archived ? '  • Archivované: ' + archived : ''}`);
  if (brokenUrls.length) {
    lines.push(`⚠️ Rozbité URL: ${brokenUrls.join(', ')}`);
  } else {
    lines.push('✅ Všechny URL odpovídají');
  }
  lines.push('');

  // Activity
  lines.push('*⚙️ Aktivita (davidnavratil.com)*');
  lines.push(`• Commity: ${commits.length}`);
  lines.push(`• Deploye: ${deploySuccess} OK, ${deployFailed ? deployFailed + ' FAILED' : '0 failed'}`);
  lines.push(`• Dashboard běhů: ${dashboardRuns.total_count}`);
  lines.push(`• Audit běhů: ${auditRuns.total_count}`);
  if (mergedPrs.length) {
    lines.push(`• Mergnuté PR: ${mergedPrs.length}`);
  }
  lines.push('');

  // Audit state
  if (auditIssue) {
    lines.push(`🔎 *Otevřený audit:* ${auditIssue.title}`);
    lines.push(`  → ${auditIssue.url}`);
    lines.push('');
  }

  // PR queue
  if (openedPrs.length > 0) {
    lines.push(`*📦 Otevřené PR:* ${openedPrs.length}${dependabotOpenCount > 0 ? ' (z toho ' + dependabotOpenCount + ' Dependabot)' : ''}`);
    lines.push('  → https://github.com/davidnavratil/davidnavratil.com/pulls');
    lines.push('');
  }

  // Substack
  if (articles.length) {
    lines.push(`*📰 Substack — ${articles.length} nových*`);
    for (const a of articles.slice(0, 3)) {
      lines.push(`• ${a.title ?? a.name ?? '(bez titulu)'}`);
    }
    lines.push('');
  }

  // Cross-repo activity (only if PAT is set and returned data)
  if (repoActivities.length > 0) {
    const active = repoActivities.filter((r) => r.commits > 0 || r.deploys > 0);
    const stale = repoActivities.filter((r) => r.daysSincePush !== null && r.daysSincePush >= 30);

    if (active.length > 0) {
      lines.push('*🛠️ Aktivita v analýzách*');
      // sort most active first
      active.sort((a, b) => b.commits + b.deploys - (a.commits + a.deploys));
      for (const r of active.slice(0, 8)) {
        const parts: string[] = [];
        if (r.commits) parts.push(`${r.commits} commit${r.commits === 1 ? '' : 'y'}`);
        if (r.deploys) parts.push(`${r.deploys} deploy${r.deploys === 1 ? '' : 'e'}`);
        if (r.deploysFailed) parts.push(`⚠️ ${r.deploysFailed} failed`);
        lines.push(`• ${r.repo} — ${parts.join(', ')}`);
      }
      lines.push('');
    }

    if (stale.length > 0) {
      lines.push(`*💤 Tiché analýzy (≥30 dní bez pushe)*`);
      stale.sort((a, b) => (b.daysSincePush ?? 0) - (a.daysSincePush ?? 0));
      for (const r of stale.slice(0, 5)) {
        lines.push(`• ${r.repo} — ${r.daysSincePush} dní`);
      }
      lines.push('');
    }
  }

  lines.push('[Dashboard](https://davidnavratil.com/status/)');

  const digest = lines.join('\n');
  writeFileSync('/tmp/weekly-summary.txt', digest);
  console.log(`Wrote /tmp/weekly-summary.txt (${digest.length} chars)`);
  console.log('---');
  console.log(digest);
}

main().catch((err) => {
  console.error('Weekly summary failed:', err);
  process.exit(1);
});
