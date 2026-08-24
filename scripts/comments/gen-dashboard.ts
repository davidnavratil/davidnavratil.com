/**
 * Comments dashboard generator — produces /tmp/comments-dashboard.html.
 * Deployed to Mozek at /var/www/davidnavratil.com/status/comments/ (inherits
 * basic auth from the /status/ nginx location).
 *
 * SECURITY: comment bodies, author names and URLs are written by anyone on
 * the internet — every rendered field MUST go through escapeHtml()/safeUrl().
 *
 * Run: npx tsx scripts/comments/gen-dashboard.ts
 */

import { writeFileSync } from 'node:fs';
import { escapeHtml, loadInsights, loadStore, safeUrl } from './lib.ts';
import type { CommentRecord, Sentiment } from './types.ts';

const OUT_PATH = '/tmp/comments-dashboard.html';

const SENTIMENT_META: Record<Sentiment, { label: string; color: string }> = {
  positive: { label: 'Pozitivní', color: '#059669' },
  neutral: { label: 'Neutrální', color: '#736D64' },
  critical: { label: 'Kritický', color: '#B45309' },
  negative: { label: 'Negativní', color: '#dc2626' },
};

const PLATFORM_LABEL: Record<string, string> = {
  substack: 'Substack',
  linkedin: 'LinkedIn',
  x: 'X',
};

function badge(text: string, color: string): string {
  return `<span class="badge" style="background:${color}">${escapeHtml(text)}</span>`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function renderComment(c: CommentRecord, depth: number): string {
  const a = c.analysis;
  const sent = a ? SENTIMENT_META[a.sentiment] : null;
  const authorName = escapeHtml(c.author.name);
  const authorHtml = c.author.url
    ? `<a href="${escapeHtml(safeUrl(c.author.url))}" target="_blank" rel="noopener nofollow">${authorName}</a>`
    : authorName;

  const draftHtml =
    a?.needs_reply && a.reply_draft
      ? `<div class="draft" data-replied="${c.replied}">
          <div class="draft-head">
            <span>✍️ Návrh odpovědi${c.replied ? ' · <em>zodpovězeno</em>' : ''}</span>
            <button class="copy-btn" data-copy-id="${escapeHtml(c.id)}">Kopírovat</button>
          </div>
          <div class="draft-text" id="draft-${escapeHtml(c.id)}">${escapeHtml(a.reply_draft)}</div>
        </div>`
      : '';

  return `
    <div class="comment" style="margin-left:${Math.min(depth, 4) * 24}px"
         data-platform="${escapeHtml(c.platform)}"
         data-sentiment="${a ? escapeHtml(a.sentiment) : 'none'}"
         data-needs-reply="${a?.needs_reply && !c.replied ? '1' : '0'}">
      <div class="comment-head">
        <span class="author">${authorHtml}</span>
        <span class="meta">${escapeHtml(fmtDate(c.date))}${c.likes ? ` · ♥ ${c.likes}` : ''} · ${escapeHtml(PLATFORM_LABEL[c.platform] ?? c.platform)}</span>
        ${sent ? badge(sent.label, sent.color) : badge('Neanalyzováno', '#a09a8f')}
        ${a?.needs_reply && !c.replied ? badge('Čeká na odpověď', '#5B4B8A') : ''}
      </div>
      <div class="comment-body">${escapeHtml(c.body)}</div>
      ${a?.note ? `<div class="note">💡 ${escapeHtml(a.note)}</div>` : ''}
      ${a?.topics?.length ? `<div class="topics">${a.topics.map((t) => `<span class="topic">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      ${draftHtml}
    </div>`;
}

/** Order a post's comments as threads: each top-level comment followed by its replies. */
function threadOrder(comments: CommentRecord[]): { c: CommentRecord; depth: number }[] {
  const byParent = new Map<string | null, CommentRecord[]>();
  for (const c of comments) {
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }
  const known = new Set(comments.map((c) => c.comment_id));
  const out: { c: CommentRecord; depth: number }[] = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of byParent.get(parent) ?? []) {
      out.push({ c, depth });
      walk(c.comment_id, depth + 1);
    }
  };
  walk(null, 0);
  // Orphans (parent outside this set — e.g. deleted) render at top level.
  for (const c of comments) {
    if (c.parent_id !== null && !known.has(c.parent_id)) out.push({ c, depth: 0 });
  }
  return out;
}

function main() {
  const store = loadStore();
  const insights = loadInsights();
  const comments = store.comments;

  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const newThisWeek = comments.filter((c) => new Date(c.collected_at).getTime() > weekAgo).length;
  const needsReply = comments.filter((c) => c.analysis?.needs_reply && !c.replied).length;

  const sentCounts: Record<Sentiment, number> = { positive: 0, neutral: 0, critical: 0, negative: 0 };
  const topicCounts = new Map<string, number>();
  for (const c of comments) {
    if (!c.analysis) continue;
    sentCounts[c.analysis.sentiment]++;
    for (const t of c.analysis.topics) topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
  }
  const analyzedCount = Object.values(sentCounts).reduce((a, b) => a + b, 0);
  const topTopics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxTopic = topTopics[0]?.[1] ?? 1;

  // Group by post, newest post first (by newest comment in it).
  const byPost = new Map<string, CommentRecord[]>();
  for (const c of comments) {
    const list = byPost.get(c.post.id) ?? [];
    list.push(c);
    byPost.set(c.post.id, list);
  }
  const postGroups = [...byPost.values()].sort(
    (a, b) =>
      Math.max(...b.map((c) => new Date(c.date).getTime())) -
      Math.max(...a.map((c) => new Date(c.date).getTime())),
  );

  const lastRun = insights.runs[insights.runs.length - 1];

  const html = `<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Komentáře — davidnavratil.com</title>
<meta name="robots" content="noindex, nofollow">
<style>
  :root {
    --bg: #F5F1E8; --ink: #111; --muted: #736D64;
    --border: #E0DCD4; --card: #fff; --accent: #1B7D8A;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--bg); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    line-height: 1.5; padding: 24px; max-width: 900px; margin: 0 auto;
  }
  h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; }
  .subtitle { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
  .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .stat { background: var(--card); border: 1px solid var(--border); padding: 12px 16px; border-radius: 8px; flex: 1; min-width: 140px; }
  .stat-value { font-size: 22px; font-weight: 700; }
  .stat-label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 24px 0 12px; font-weight: 600; }
  .banner { background: var(--card); border: 1px solid var(--border); border-left: 4px solid var(--accent); padding: 12px 16px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; }
  .banner.bias { border-left-color: #B45309; color: var(--muted); }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; color: #fff; font-size: 11px; font-weight: 600; }
  .filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
  .filters button { border: 1px solid var(--border); background: var(--card); border-radius: 9999px; padding: 4px 12px; font-size: 13px; cursor: pointer; }
  .filters button.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .post-group { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
  .post-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; }
  .post-title a { color: var(--accent); text-decoration: none; }
  .post-title a:hover { text-decoration: underline; }
  .comment { border-top: 1px solid var(--border); padding: 10px 0; }
  .comment[hidden] { display: none; }
  .comment-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; margin-bottom: 4px; }
  .author { font-weight: 600; }
  .author a { color: var(--accent); text-decoration: none; }
  .meta { color: var(--muted); font-size: 12px; }
  .comment-body { font-size: 14px; white-space: pre-wrap; }
  .note { font-size: 12px; color: var(--muted); margin-top: 4px; }
  .topics { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
  .topic { font-size: 11px; background: var(--bg); border: 1px solid var(--border); border-radius: 9999px; padding: 1px 8px; color: var(--muted); }
  .draft { background: #F0F7F8; border: 1px solid #cfe3e6; border-radius: 6px; padding: 8px 12px; margin-top: 8px; }
  .draft[data-replied="true"] { opacity: 0.55; }
  .draft-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--accent); font-weight: 600; margin-bottom: 4px; }
  .draft-text { font-size: 13px; white-space: pre-wrap; }
  .copy-btn { border: 1px solid var(--accent); background: #fff; color: var(--accent); border-radius: 6px; padding: 2px 10px; font-size: 12px; cursor: pointer; }
  .copy-btn:active { background: var(--accent); color: #fff; }
  .bars { display: grid; gap: 6px; }
  .bar-row { display: grid; grid-template-columns: 110px 1fr 40px; align-items: center; gap: 8px; font-size: 12px; }
  .bar-track { background: var(--card); border: 1px solid var(--border); border-radius: 4px; height: 14px; overflow: hidden; }
  .bar-fill { height: 100%; }
  ul.insights { margin: 0; padding-left: 20px; font-size: 14px; }
  ul.insights li { margin-bottom: 6px; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--muted); font-size: 12px; }
</style>
</head>
<body>

<h1>Komentáře pod příspěvky</h1>
<div class="subtitle">Generováno ${escapeHtml(new Date().toISOString().replace('T', ' ').slice(0, 16))} UTC · ${comments.length} komentářů ve store</div>

<div class="summary">
  <div class="stat"><div class="stat-value">${comments.length}</div><div class="stat-label">Celkem</div></div>
  <div class="stat"><div class="stat-value">${newThisWeek}</div><div class="stat-label">Nové za 7 dní</div></div>
  <div class="stat"><div class="stat-value" style="color:${needsReply ? '#5B4B8A' : '#059669'}">${needsReply}</div><div class="stat-label">Čeká na odpověď</div></div>
  <div class="stat"><div class="stat-value" style="color:#059669">${analyzedCount ? Math.round((sentCounts.positive / analyzedCount) * 100) + ' %' : '—'}</div><div class="stat-label">Pozitivních</div></div>
</div>

<div class="banner bias">⚖️ Komentující jsou samovybraná menšina čtenářů — vyhraněné hlasy jsou nadreprezentované. Vše níže čti jako „mezi komentujícími", ne jako hlas čtenářů.</div>

${lastRun ? `<h2>Postřehy z poslední analýzy (${escapeHtml(fmtDate(lastRun.run_at))})</h2>
<div class="banner"><ul class="insights">${lastRun.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul></div>` : ''}

<h2>Sentiment${analyzedCount ? ` (${analyzedCount} analyzovaných)` : ''}</h2>
<div class="bars">
${(Object.keys(SENTIMENT_META) as Sentiment[])
  .map((s) => {
    const n = sentCounts[s];
    const pct = analyzedCount ? Math.round((n / analyzedCount) * 100) : 0;
    return `  <div class="bar-row"><span>${escapeHtml(SENTIMENT_META[s].label)}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${SENTIMENT_META[s].color}"></div></div><span>${n}</span></div>`;
  })
  .join('\n')}
</div>

${topTopics.length ? `<h2>Nejčastější témata</h2>
<div class="bars">
${topTopics.map(([t, n]) => `  <div class="bar-row"><span>${escapeHtml(t)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round((n / maxTopic) * 100)}%;background:var(--accent)"></div></div><span>${n}</span></div>`).join('\n')}
</div>` : ''}

<h2>Komentáře</h2>
<div class="filters">
  <button data-filter="all" class="active">Vše</button>
  <button data-filter="needs-reply">Čeká na odpověď</button>
  <button data-filter="positive">Pozitivní</button>
  <button data-filter="critical">Kritické</button>
  <button data-filter="negative">Negativní</button>
</div>

${postGroups
  .map((group) => {
    const post = group[0].post;
    const ordered = threadOrder(group);
    return `<div class="post-group">
  <div class="post-title"><a href="${escapeHtml(safeUrl(post.url))}" target="_blank" rel="noopener">${escapeHtml(post.title)}</a> <span class="meta">(${group.length})</span></div>
  ${ordered.map(({ c, depth }) => renderComment(c, depth)).join('\n')}
</div>`;
  })
  .join('\n')}

<div class="footer">
  <div>Zdroj: store na serveru (Substack API + ruční vstup). Návrhy odpovědí generuje Claude — odesíláš je vždy ty.</div>
  <div>Skripty: <code>scripts/comments/</code>. Workflow: <code>.github/workflows/comments.yml</code>.</div>
</div>

<script>
  // Filters
  document.querySelectorAll('.filters button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filters button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('.comment').forEach((el) => {
        const show =
          f === 'all' ||
          (f === 'needs-reply' && el.dataset.needsReply === '1') ||
          el.dataset.sentiment === f;
        el.hidden = !show;
      });
      document.querySelectorAll('.post-group').forEach((g) => {
        g.hidden = ![...g.querySelectorAll('.comment')].some((el) => !el.hidden);
      });
    });
  });
  // Copy reply drafts
  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const el = document.getElementById('draft-' + btn.dataset.copyId);
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.textContent);
        btn.textContent = 'Zkopírováno ✓';
        setTimeout(() => (btn.textContent = 'Kopírovat'), 1500);
      } catch { /* clipboard blocked — user selects manually */ }
    });
  });
</script>

</body>
</html>`;

  writeFileSync(OUT_PATH, html);
  console.log(`Wrote ${OUT_PATH} (${html.length} bytes) — ${comments.length} comments, ${needsReply} awaiting reply`);
}

main();
