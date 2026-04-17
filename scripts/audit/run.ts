/**
 * Weekly audit — minimal set of checks that caught real problems in the past:
 *  1. URL probe: for every live:true analysis, the URL must return 200
 *  2. Preview image probe: every referenced image must return 200
 *  3. SSL expiry: cert must have > 30 days left
 *
 * Output (when findings exist):
 *  - /tmp/audit-findings.json  — machine-readable list of findings
 *  - /tmp/audit-issue.md       — human-readable issue body
 *
 * Exit 0 always (never fails the workflow; presence of /tmp/audit-issue.md
 * is what signals "problems found" to the next step).
 */

import { writeFileSync } from 'node:fs';
import * as tls from 'node:tls';
import { analyses, getHref, type Analysis } from '../../src/data/analyses.ts';

const DOMAIN = 'https://davidnavratil.com';
const HOST = 'davidnavratil.com';
const SSL_WARN_DAYS = 30;

type Finding =
  | { type: 'URL-404'; key: string; title: string; url: string; status: number; flagLive: true; fix: { type: 'flip-flag'; key: string } }
  | { type: 'IMG-404'; key: string; title: string; imageUrl: string; status: number; fix: { type: 'gen-placeholder'; key: string; title: string } }
  | { type: 'SSL-EXPIRY'; host: string; daysLeft: number; fix: null };

const findings: Finding[] = [];

async function probe(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return res.status;
  } catch {
    return 0;
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
        const expiry = new Date(cert.valid_to).getTime();
        const days = Math.floor((expiry - Date.now()) / (1000 * 60 * 60 * 24));
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

async function checkUrls() {
  for (const a of analyses) {
    if (!a.live) continue; // we only probe what's advertised as live
    const href = getHref(a, 'cs');
    const url = href.startsWith('http') ? href : `${DOMAIN}${href}`;
    const status = await probe(url);
    if (status !== 200) {
      findings.push({
        type: 'URL-404',
        key: a.key,
        title: a.key,
        url,
        status,
        flagLive: true,
        fix: { type: 'flip-flag', key: a.key },
      });
    }
  }
}

async function checkImages() {
  const seen = new Set<string>();
  for (const a of analyses) {
    if (seen.has(a.image)) continue;
    seen.add(a.image);
    const url = `${DOMAIN}${a.image}`;
    const status = await probe(url);
    if (status !== 200) {
      findings.push({
        type: 'IMG-404',
        key: a.key,
        title: a.key,
        imageUrl: url,
        status,
        fix: { type: 'gen-placeholder', key: a.key, title: a.key },
      });
    }
  }
}

async function checkSsl() {
  const days = await probeSsl(HOST);
  if (days !== null && days < SSL_WARN_DAYS) {
    findings.push({
      type: 'SSL-EXPIRY',
      host: HOST,
      daysLeft: days,
      fix: null,
    });
  }
}

function formatIssue(findings: Finding[]): string {
  if (findings.length === 0) return '';
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`**Týdenní audit · ${today} · ${findings.length} problém${findings.length === 1 ? '' : 'ů'}**`);
  lines.push('');
  lines.push('Zaškrtni `[x]` u položek, které chceš opravit, a do komentáře napiš **`/fix`**.');
  lines.push('Executor vytvoří PR se všemi schválenými fixy. Nezaškrtnuté se ignorují.');
  lines.push('');

  findings.forEach((f, i) => {
    const n = i + 1;
    if (f.type === 'URL-404') {
      lines.push(`## ${n}. 🔴 [URL-404] \`${f.url}\` vrací ${f.status}, přestože flag je \`live:true\``);
      lines.push('');
      lines.push(`**Návrh:** přepnout \`live: true\` → \`false\` v \`src/data/analyses.ts\` (klíč: \`${f.key}\`)`);
      lines.push('- [ ] **auto-fix: flip-flag**');
      lines.push('');
      lines.push(`<!-- fix-meta: ${JSON.stringify(f.fix)} -->`);
      lines.push('');
    } else if (f.type === 'IMG-404') {
      lines.push(`## ${n}. 🟡 [IMG-404] \`${f.imageUrl}\` vrací ${f.status}`);
      lines.push('');
      lines.push(`**Návrh:** vygenerovat brand-aligned placeholder (800×500 .webp)`);
      lines.push('- [ ] **auto-fix: gen-placeholder**');
      lines.push('');
      lines.push(`<!-- fix-meta: ${JSON.stringify(f.fix)} -->`);
      lines.push('');
    } else if (f.type === 'SSL-EXPIRY') {
      lines.push(`## ${n}. ⚠️ [SSL] \`${f.host}\` vyprší za ${f.daysLeft} dní`);
      lines.push('');
      lines.push('**Návrh:** na Mozku spustit `certbot renew`. (Obvykle běží auto-renew, tohle je jen upozornění.)');
      lines.push('- [ ] (manuální — bez auto-fixu)');
      lines.push('');
    }
  });

  return lines.join('\n');
}

async function main() {
  console.log('Running weekly audit...');
  await Promise.all([checkUrls(), checkImages(), checkSsl()]);

  if (findings.length === 0) {
    console.log('✓ No problems found. Audit passed.');
    return;
  }

  console.log(`Found ${findings.length} problem(s):`);
  for (const f of findings) {
    console.log(`  - [${f.type}] ${'key' in f ? f.key : f.host}`);
  }

  writeFileSync('/tmp/audit-findings.json', JSON.stringify(findings, null, 2));
  writeFileSync('/tmp/audit-issue.md', formatIssue(findings));
  console.log('Wrote /tmp/audit-findings.json and /tmp/audit-issue.md');
}

main().catch((err) => {
  console.error('Audit failed with exception:', err);
  process.exit(1);
});
