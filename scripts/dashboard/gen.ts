/**
 * Dashboard generator — produces /tmp/dashboard.html with the current state
 * of the davidnavratil.com platform. Deployed to Mozek at /var/www/davidnavratil.com/status/.
 *
 * Data sources:
 *  - src/data/analyses.ts          — analysis portfolio (status, live, href, image)
 *  - src/data/articles-cache.json  — last Substack article (via daily RSS cron)
 *  - live HTTP probes              — URLs, preview images, site pages
 *  - TLS probe                     — SSL cert expiry
 *  - gh CLI (GITHUB_TOKEN env)     — open audit issue (same repo)
 *
 * Run: npx tsx scripts/dashboard/gen.ts
 */

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as tls from 'node:tls';
import { analyses, getHref, type Analysis } from '../../src/data/analyses.ts';

const DOMAIN = 'https://davidnavratil.com';
const HOST = 'davidnavratil.com';

type Status = 'published' | 'drafting' | 'research' | 'archived';
type Probe = { status: number; ok: boolean };

interface AnalysisRow {
  key: string;
  href: string;
  status: Status;
  live: boolean;
  date: string;
  url: string;
  urlProbe: Probe;
  image: string;
  imgProbe: Probe;
}

interface SiteHealth {
  pages: { path: string; probe: Probe }[];
  sslDaysLeft: number | null;
  auditIssue: { number: number; title: string; url: string } | null;
  lastArticle: { title: string; date: string; url: string } | null;
  dependabotPrs: number;
  generatedAt: string;
}

// ----- probes -----

async function probe(url: string): Promise<Probe> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return { status: res.status, ok: res.status === 200 };
  } catch {
    return { status: 0, ok: false };
  }
}

function probeSsl(host: string): Promise<number | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert?.valid_to) return resolve(null);
        const days = Math.floor(
          (new Date(cert.valid_to).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        resolve(days);
      },
    );
    socket.on('error', () => resolve(null));
    setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, 5000);
  });
}

function getAuditIssue(): SiteHealth['auditIssue'] {
  try {
    const out = execSync(
      'gh issue list --label audit --state open --limit 1 --json number,title,url 2>/dev/null',
      { encoding: 'utf-8' },
    );
    const arr = JSON.parse(out || '[]');
    return arr[0] ?? null;
  } catch {
    return null;
  }
}

function getDependabotPrs(): number {
  try {
    const out = execSync(
      'gh pr list --state open --author app/dependabot --json number 2>/dev/null',
      { encoding: 'utf-8' },
    );
    return JSON.parse(out || '[]').length;
  } catch {
    return 0;
  }
}

function getLastArticle(): SiteHealth['lastArticle'] {
  const path = 'src/data/articles-cache.json';
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    const articles = Array.isArray(data) ? data : data.articles ?? [];
    if (!articles.length) return null;
    const first = articles[0];
    return {
      title: first.title ?? first.name ?? '(bez titulu)',
      date: (first.pubDate ?? first.date ?? '').slice(0, 10),
      url: first.link ?? first.url ?? '#',
    };
  } catch {
    return null;
  }
}

function statusOf(a: Analysis): Status {
  if (a.status) return a.status;
  return a.live ? 'published' : 'drafting';
}

// ----- HTML -----

const STATUS_META: Record<Status, { label: string; color: string }> = {
  published: { label: 'Publikováno', color: '#1B7D8A' },
  drafting:  { label: 'Rozpracováno', color: '#B45309' },
  research:  { label: 'Research',     color: '#5B4B8A' },
  archived:  { label: 'Archivováno',  color: '#736D64' },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function badge(text: string, color: string, fg = '#fff'): string {
  return `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${color};color:${fg};font-size:12px;font-weight:600;letter-spacing:0.02em;">${escapeHtml(text)}</span>`;
}

function codeTag(code: number, okLabel = '200'): string {
  const ok = code === 200;
  return badge(code === 0 ? 'net' : String(code), ok ? '#059669' : '#dc2626');
}

function renderAnalysisCard(row: AnalysisRow): string {
  const meta = STATUS_META[row.status];
  const archived = row.status === 'archived';
  const nameStyle = archived
    ? 'text-decoration: line-through; color: #a09a8f;'
    : '';
  return `
    <article class="card" data-status="${row.status}">
      <div class="card-head">
        <div class="card-title" style="${nameStyle}">${escapeHtml(row.key)}</div>
        ${badge(meta.label, meta.color)}
      </div>
      <div class="card-row">
        <span class="label">URL</span>
        <a href="${escapeHtml(row.url)}" target="_blank" rel="noopener">${escapeHtml(row.url.replace(DOMAIN, ''))}</a>
        ${codeTag(row.urlProbe.status)}
      </div>
      <div class="card-row">
        <span class="label">Preview</span>
        <span class="muted">${escapeHtml(row.image)}</span>
        ${codeTag(row.imgProbe.status)}
      </div>
      <div class="card-row">
        <span class="label">Datum</span>
        <span class="muted">${escapeHtml(row.date)}</span>
        <span class="muted" style="margin-left:auto;font-size:12px;">live: ${row.live ? 'true' : 'false'}</span>
      </div>
    </article>
  `.trim();
}

function renderPage(rows: AnalysisRow[], site: SiteHealth): string {
  const published = rows.filter((r) => r.status === 'published').length;
  const drafting = rows.filter((r) => r.status === 'drafting').length;
  const archived = rows.filter((r) => r.status === 'archived').length;

  const sslWarn = site.sslDaysLeft !== null && site.sslDaysLeft < 30;
  const sslColor = site.sslDaysLeft === null ? '#dc2626' : sslWarn ? '#B45309' : '#059669';

  const allUrlsOk = rows.every((r) => r.urlProbe.ok || r.status === 'archived');
  const allImgsOk = rows.every((r) => r.imgProbe.ok || r.status === 'archived');
  const pagesOk = site.pages.every((p) => p.probe.ok);

  const sorted = [...rows].sort((a, b) => {
    const order: Record<Status, number> = { drafting: 0, research: 1, published: 2, archived: 3 };
    return order[a.status] - order[b.status];
  });

  return `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Status — davidnavratil.com</title>
<meta name="robots" content="noindex, nofollow">
<style>
  :root {
    --bg: #F5F1E8;
    --ink: #111;
    --muted: #736D64;
    --border: #E0DCD4;
    --card: #fff;
    --accent: #1B7D8A;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    line-height: 1.5;
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
  }
  h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .subtitle { color: var(--muted); font-size: 13px; margin-bottom: 24px; }
  .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
  .stat {
    background: var(--card); border: 1px solid var(--border);
    padding: 12px 16px; border-radius: 8px; flex: 1; min-width: 160px;
  }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 24px 0 12px; font-weight: 600; }
  .banner {
    background: var(--card); border: 1px solid var(--border); border-left: 4px solid var(--accent);
    padding: 12px 16px; border-radius: 6px; margin-bottom: 16px;
  }
  .banner.warn { border-left-color: #B45309; }
  .banner.err  { border-left-color: #dc2626; }
  .banner .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 14px; }
  .banner a { color: var(--accent); text-decoration: none; }
  .banner a:hover { text-decoration: underline; }
  .grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
  @media (min-width: 720px) { .grid { grid-template-columns: 1fr 1fr; } }
  .card {
    background: var(--card); border: 1px solid var(--border);
    padding: 12px 16px; border-radius: 8px;
  }
  .card[data-status="archived"] { opacity: 0.6; }
  .card-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
  .card-title { font-weight: 600; font-size: 15px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .card-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-top: 4px; }
  .card-row .label { color: var(--muted); font-size: 12px; min-width: 60px; }
  .card-row a { color: var(--accent); text-decoration: none; }
  .card-row a:hover { text-decoration: underline; }
  .muted { color: var(--muted); }
  .pages-list { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 8px 0; }
  .page-item { display: flex; justify-content: space-between; align-items: center; padding: 6px 16px; font-size: 13px; }
  .page-item + .page-item { border-top: 1px solid var(--border); }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; }
</style>
</head>
<body>

<h1>Status — davidnavratil.com</h1>
<div class="subtitle">Generováno ${escapeHtml(site.generatedAt)} UTC. Refresh denně 7:00 SEČ/SELČ.</div>

<div class="summary">
  <div class="stat">
    <div class="stat-value" style="color:${allUrlsOk ? '#059669' : '#dc2626'}">${allUrlsOk ? 'OK' : 'PROBLÉM'}</div>
    <div class="stat-label">URL analýz</div>
  </div>
  <div class="stat">
    <div class="stat-value" style="color:${pagesOk ? '#059669' : '#dc2626'}">${pagesOk ? 'OK' : 'PROBLÉM'}</div>
    <div class="stat-label">Stránky webu</div>
  </div>
  <div class="stat">
    <div class="stat-value" style="color:${allImgsOk ? '#059669' : '#B45309'}">${allImgsOk ? 'OK' : 'CHYBA'}</div>
    <div class="stat-label">Preview obrázky</div>
  </div>
  <div class="stat">
    <div class="stat-value" style="color:${sslColor}">${site.sslDaysLeft === null ? '?' : site.sslDaysLeft + ' d'}</div>
    <div class="stat-label">SSL do expirace</div>
  </div>
  <div class="stat">
    <div class="stat-value">${published}</div>
    <div class="stat-label">Publikované</div>
  </div>
  <div class="stat">
    <div class="stat-value">${drafting}</div>
    <div class="stat-label">Rozpracované</div>
  </div>
</div>

${site.auditIssue
  ? `<div class="banner warn">
      <div class="row">
        <span>🔎 <strong>Otevřený týdenní audit:</strong> ${escapeHtml(site.auditIssue.title)}</span>
        <a href="${escapeHtml(site.auditIssue.url)}" target="_blank">Otevřít →</a>
      </div>
    </div>`
  : `<div class="banner"><div class="row"><span>✓ Žádný otevřený audit issue.</span></div></div>`}

${site.dependabotPrs > 0
  ? `<div class="banner warn">
      <div class="row">
        <span>📦 <strong>${site.dependabotPrs} otevřený Dependabot PR${site.dependabotPrs === 1 ? '' : site.dependabotPrs >= 2 && site.dependabotPrs <= 4 ? 'y' : 'ů'}</strong> na davidnavratil.com</span>
        <a href="https://github.com/davidnavratil/davidnavratil.com/pulls" target="_blank">Zobrazit →</a>
      </div>
    </div>`
  : ''}

${site.lastArticle
  ? `<div class="banner">
      <div class="row">
        <span>📝 <strong>Poslední článek na Substacku</strong> (${escapeHtml(site.lastArticle.date)}): ${escapeHtml(site.lastArticle.title)}</span>
        <a href="${escapeHtml(site.lastArticle.url)}" target="_blank">Číst →</a>
      </div>
    </div>`
  : ''}

<h2>Stránky webu</h2>
<div class="pages-list">
  ${site.pages.map((p) => `
    <div class="page-item">
      <a href="${DOMAIN}${escapeHtml(p.path)}" target="_blank" style="color:var(--accent);text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(p.path)}</a>
      ${codeTag(p.probe.status)}
    </div>
  `).join('')}
</div>

<h2>Analýzy (${sorted.length})</h2>
<div class="grid">
  ${sorted.map(renderAnalysisCard).join('\n')}
</div>

<div class="footer">
  <div>Zdroj: <code>src/data/analyses.ts</code> + live HTTP/TLS probe + GitHub API.</div>
  <div>Status se edituje v analyses.ts: <code>published</code> / <code>drafting</code> / <code>research</code> / <code>archived</code>.</div>
  <div>Dashboard skript: <code>scripts/dashboard/gen.ts</code>. Workflow: <code>.github/workflows/dashboard.yml</code>.</div>
</div>

</body>
</html>`;
}

// ----- main -----

async function main() {
  console.log('Building dashboard...');

  const corePages = ['/', '/analyses/', '/en/', '/en/analyses/', '/sitemap-index.xml', '/robots.txt'];
  const [pageProbes, sslDaysLeft] = await Promise.all([
    Promise.all(corePages.map(async (p) => ({ path: p, probe: await probe(`${DOMAIN}${p}`) }))),
    probeSsl(HOST),
  ]);

  const rows: AnalysisRow[] = await Promise.all(
    analyses.map(async (a) => {
      const href = getHref(a, 'cs');
      const url = href.startsWith('http') ? href : `${DOMAIN}${href}`;
      const [urlProbe, imgProbe] = await Promise.all([
        probe(url),
        probe(`${DOMAIN}${a.image}`),
      ]);
      return {
        key: a.key,
        href,
        status: statusOf(a),
        live: a.live,
        date: a.date,
        url,
        urlProbe,
        image: a.image,
        imgProbe,
      };
    }),
  );

  const site: SiteHealth = {
    pages: pageProbes,
    sslDaysLeft,
    auditIssue: getAuditIssue(),
    lastArticle: getLastArticle(),
    dependabotPrs: getDependabotPrs(),
    generatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
  };

  const html = renderPage(rows, site);
  writeFileSync('/tmp/dashboard.html', html);
  console.log(`Wrote /tmp/dashboard.html (${html.length} bytes)`);

  // brief status to stdout
  console.log('');
  console.log('Summary:');
  console.log(`  Analyses: ${rows.length} (${rows.filter((r) => r.status === 'published').length} published, ${rows.filter((r) => r.status === 'drafting').length} drafting, ${rows.filter((r) => r.status === 'archived').length} archived)`);
  console.log(`  URLs OK: ${rows.filter((r) => r.urlProbe.ok).length}/${rows.length}`);
  console.log(`  Images OK: ${rows.filter((r) => r.imgProbe.ok).length}/${rows.length}`);
  console.log(`  Core pages OK: ${site.pages.filter((p) => p.probe.ok).length}/${site.pages.length}`);
  console.log(`  SSL days left: ${site.sslDaysLeft ?? '?'}`);
  console.log(`  Audit issue: ${site.auditIssue ? '#' + site.auditIssue.number : 'none'}`);
  console.log(`  Dependabot PRs: ${site.dependabotPrs}`);
}

main().catch((err) => {
  console.error('Dashboard gen failed:', err);
  process.exit(1);
});
