/**
 * Weekly audit — checks that have caught real problems in the past:
 *
 *  Core (original):
 *    1. URL probe: for every live:true analysis, the URL must return 200
 *    2. Preview image probe: every referenced image must return 200
 *    3. SSL expiry: cert must have > 30 days left
 *
 *  Extended (added 2026-06-02 after manual audit found gaps):
 *    4. Sitemap dead URLs: every customPages entry must return 200
 *       (catches trailing-slash mismatches between Astro sitemap and Next.js exports)
 *    5. Sitemap missing live: every live:true analysis must appear in the sitemap
 *       (catches new analyses that were not registered in astro.config.mjs customPages)
 *    6. Security headers: every live root URL must serve HSTS + X-Frame-Options
 *       + X-Content-Type-Options + Referrer-Policy + Permissions-Policy
 *       (catches nginx location blocks that forgot to include the security stanza)
 *    7. Sub-route smoke test: for known Next.js sub-routes (declared in
 *       SUBROUTE_PROBES) verify each returns 200
 *       (catches broken deploys that ship the root but lose sub-pages)
 *
 *  Output (when findings exist):
 *    - /tmp/audit-findings.json  — machine-readable list of findings
 *    - /tmp/audit-issue.md       — human-readable issue body
 *
 *  Exit 0 always (never fails the workflow; presence of /tmp/audit-issue.md
 *  is what signals "problems found" to the next step).
 */

import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as tls from 'node:tls';
import { analyses, getHref, type Analysis } from '../../src/data/analyses.ts';

const DOMAIN = 'https://davidnavratil.com';
const HOST = 'davidnavratil.com';
const SSL_WARN_DAYS = 30;

/**
 * Required response headers on every public production page.
 * Each entry: [header name, optional substring the value must contain].
 * The substring lets us catch a stripped value (e.g. HSTS without preload).
 */
const REQUIRED_HEADERS: ReadonlyArray<[string, string | null]> = [
  ['strict-transport-security', 'max-age='],
  ['x-frame-options', null],
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', null],
  ['content-security-policy', "default-src 'self'"],
  ['permissions-policy', null],
];

/**
 * Sub-routes for Next.js apps that should each return 200.
 * Listing them here is cheap insurance — if a deploy lands `index.html` but
 * silently drops sub-routes (which has happened), the audit will flag it.
 * Paths are relative to DOMAIN.
 */
const SUBROUTE_PROBES: ReadonlyArray<{ analysis: string; path: string }> = [
  { analysis: 'chokepoints', path: '/analyses/uzka-hrdla/cesko' },
  { analysis: 'chokepoints', path: '/analyses/uzka-hrdla/historie' },
  { analysis: 'chokepoints', path: '/analyses/uzka-hrdla/simulator' },
  { analysis: 'chokepoints', path: '/analyses/uzka-hrdla/sit' },
  { analysis: 'ree', path: '/analyses/ree-dashboard/cs/prices' },
  { analysis: 'ree', path: '/analyses/ree-dashboard/cs/supply-chain' },
  { analysis: 'ree', path: '/analyses/ree-dashboard/cs/demand' },
  { analysis: 'ree', path: '/analyses/ree-dashboard/cs/geopolitics' },
  { analysis: 'ree', path: '/analyses/ree-dashboard/cs/czech' },
  { analysis: 'ree', path: '/analyses/ree-dashboard/cs/about' },
  { analysis: 'ree', path: '/analyses/ree-dashboard/en/prices' },
];

type Finding =
  | { type: 'URL-404'; key: string; title: string; url: string; status: number; flagLive: true; fix: { type: 'flip-flag'; key: string } }
  | { type: 'IMG-404'; key: string; title: string; imageUrl: string; status: number; fix: { type: 'gen-placeholder'; key: string; title: string } }
  | { type: 'SSL-EXPIRY'; host: string; daysLeft: number; fix: null }
  | { type: 'SSL-PROBE-FAILED'; host: string; fix: null }
  | { type: 'SITEMAP-DEAD'; url: string; status: number; fix: null }
  | { type: 'SITEMAP-MISSING-LIVE'; key: string; expectedUrl: string; fix: null }
  | { type: 'HEADERS-MISSING'; url: string; missing: string[]; fix: null }
  | { type: 'SUBROUTE-404'; analysis: string; url: string; status: number; fix: null };

const findings: Finding[] = [];

async function probe(url: string): Promise<number> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return res.status;
  } catch {
    return 0;
  }
}

async function probeHeaders(url: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    res.headers.forEach((v, k) => out.set(k.toLowerCase(), v));
  } catch {
    /* swallow — empty map signals failure */
  }
  return out;
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

/** Read the live customPages array from astro.config.mjs without importing it. */
async function readSitemapCustomPages(): Promise<string[]> {
  const here = dirname(fileURLToPath(import.meta.url));
  const cfgPath = resolve(here, '..', '..', 'astro.config.mjs');
  const src = await readFile(cfgPath, 'utf-8');
  // Grab every quoted https://davidnavratil.com/* URL inside the customPages: [...] block.
  const customBlock = src.match(/customPages\s*:\s*\[([\s\S]*?)\]/);
  if (!customBlock) return [];
  return Array.from(customBlock[1].matchAll(/['"`](https:\/\/davidnavratil\.com[^'"`]*)['"`]/g)).map(
    (m) => m[1],
  );
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

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
  if (days === null) {
    // Silent failure was the bug that let a 25-day cert through on 2026-05-31.
    // Surface it as a finding so the operator sees the probe broke.
    console.warn(`! SSL probe returned null for ${HOST} — cannot verify expiry`);
    findings.push({ type: 'SSL-PROBE-FAILED', host: HOST, fix: null });
    return;
  }
  console.log(`SSL ${HOST}: ${days} days left (threshold ${SSL_WARN_DAYS})`);
  if (days < SSL_WARN_DAYS) {
    findings.push({
      type: 'SSL-EXPIRY',
      host: HOST,
      daysLeft: days,
      fix: null,
    });
  }
}

/**
 * Verify every URL listed in astro.config.mjs `customPages` returns 200.
 * Catches sitemap drift after deploy changes — the canonical bug here was
 * sitemap entries `/foo/` while Next.js export served `/foo` (no slash).
 */
async function checkSitemapDead(sitemapUrls: string[]) {
  const results = await Promise.all(
    sitemapUrls.map(async (url) => ({ url, status: await probe(url) })),
  );
  for (const { url, status } of results) {
    if (status !== 200) {
      findings.push({ type: 'SITEMAP-DEAD', url, status, fix: null });
    }
  }
}

/**
 * Verify every live:true analysis has at least one matching sitemap entry.
 * Match is href-prefix: a sitemap URL must start with the analysis href.
 */
function checkSitemapMissingLive(sitemapUrls: string[]) {
  for (const a of analyses) {
    if (!a.live) continue;
    const csHref = getHref(a, 'cs');
    // Astro auto-discovers its own routes — skip relative roots like '/' and pure-Astro pages.
    if (!csHref.startsWith('/analyses/')) continue;
    const expectedPrefix = csHref.split('?')[0]; // strip ?lang=en etc.
    const expectedUrl = expectedPrefix.startsWith('http') ? expectedPrefix : `${DOMAIN}${expectedPrefix}`;
    const found = sitemapUrls.some((s) => s.startsWith(expectedUrl.replace(/\/$/, '')));
    if (!found) {
      findings.push({
        type: 'SITEMAP-MISSING-LIVE',
        key: a.key,
        expectedUrl,
        fix: null,
      });
    }
  }
}

/**
 * Every live root URL AND every declared sub-route must carry the full
 * security header stanza. Subtle past bug: nginx applied the headers only
 * to a specific location block, so the root served them but sub-routes
 * (`/cesko`, `/cs/prices`) returned only bare CSP. Probe both.
 */
async function checkHeaders() {
  const urls: string[] = [];
  for (const a of analyses) {
    if (!a.live) continue;
    const href = getHref(a, 'cs');
    urls.push(href.startsWith('http') ? href : `${DOMAIN}${href.split('?')[0]}`);
  }
  for (const probe_ of SUBROUTE_PROBES) {
    urls.push(`${DOMAIN}${probe_.path}`);
  }

  for (const url of urls) {
    const headers = await probeHeaders(url);
    if (headers.size === 0) continue; // probe failed — already covered by URL-404 / SUBROUTE-404
    const missing: string[] = [];
    for (const [name, mustContain] of REQUIRED_HEADERS) {
      const v = headers.get(name);
      if (!v) {
        missing.push(name);
      } else if (mustContain && !v.includes(mustContain)) {
        missing.push(`${name} (missing "${mustContain}")`);
      }
    }
    if (missing.length > 0) {
      findings.push({ type: 'HEADERS-MISSING', url, missing, fix: null });
    }
  }
}

/**
 * Smoke-test a curated set of Next.js sub-routes. These should all be 200;
 * if they're not, either the deploy is broken or the Next.js `trailingSlash`
 * config diverged from the sitemap.
 */
async function checkSubroutes() {
  for (const probe_ of SUBROUTE_PROBES) {
    const url = `${DOMAIN}${probe_.path}`;
    const status = await probe(url);
    if (status !== 200) {
      findings.push({
        type: 'SUBROUTE-404',
        analysis: probe_.analysis,
        url,
        status,
        fix: null,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Issue rendering
// ---------------------------------------------------------------------------

function formatIssue(findings: Finding[]): string {
  if (findings.length === 0) return '';
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  const n = findings.length;
  const noun = n === 1 ? 'problém' : n >= 2 && n <= 4 ? 'problémy' : 'problémů';
  lines.push(`**Týdenní audit · ${today} · ${n} ${noun}**`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📋 Jak postupovat');
  lines.push('');
  lines.push('1. **Projdi seznam problémů níže** — každý má navržený fix.');
  lines.push('2. **U položek s checkboxem zaškrtni `[x]`** — to jsou auto-fixy.');
  lines.push('   - V GitHub UI: klikni na čtvereček. V e-mailu to nejde — otevři issue v prohlížeči.');
  lines.push('3. **Napiš komentář s textem `/fix`** (stačí samotné slovo `/fix`).');
  lines.push('4. **Počkej ~1 minutu** — executor vyrobí Pull Request se všemi zaškrtnutými opravami.');
  lines.push('5. **Zkontroluj PR a mergni ho** — tím se pushne auto-deploy na Mozek.');
  lines.push('');
  lines.push('### Položky bez checkboxu');
  lines.push('');
  lines.push('Některá zjištění (SSL renewal, nginx hlavičky, sitemap drift) potřebují ruční zásah na serveru nebo v configu. Pro ně je v issue jen popis a návrh kroků, žádný auto-fix.');
  lines.push('');
  lines.push('### Nechceš řešit nic?');
  lines.push('');
  lines.push('- **Ignorovat všechno** → zavři issue (nic se nestane)');
  lines.push('- **Ignorovat jen některé** → nezaškrtávej je, jen zaškrtnuté půjdou do PR');
  lines.push('- **Odložit** → nech issue otevřený, příští týden ho audit přepíše s aktuálním stavem');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🔍 Nalezené problémy');
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
      lines.push('**Návrh:** na Mozku ověřit `certbot renew --dry-run`. Auto-renew obvykle proběhne ~30 dní před expirací; pokud ne, ručně `certbot renew && systemctl reload nginx`.');
      lines.push('- [ ] (manuální — bez auto-fixu)');
      lines.push('');
    } else if (f.type === 'SSL-PROBE-FAILED') {
      lines.push(`## ${n}. 🔴 [SSL-PROBE-FAILED] TLS probe k \`${f.host}\` selhala`);
      lines.push('');
      lines.push('**Návrh:** spustit ručně `echo | openssl s_client -servername ' + f.host + ' -connect ' + f.host + ':443 | openssl x509 -noout -dates` a ověřit expiry. Předchozí audity mohly tichý timeout ignorovat — kontroluj certbot timer.');
      lines.push('- [ ] (manuální — bez auto-fixu)');
      lines.push('');
    } else if (f.type === 'SITEMAP-DEAD') {
      lines.push(`## ${n}. 🔴 [SITEMAP-DEAD] \`${f.url}\` vrací ${f.status}, ale je v sitemap`);
      lines.push('');
      lines.push('**Návrh:** v `astro.config.mjs` upravit `customPages` — buď URL opravit (typicky odebrat/přidat trailing slash), nebo položku odstranit, pokud stránka už neexistuje.');
      lines.push('- [ ] (manuální — bez auto-fixu)');
      lines.push('');
    } else if (f.type === 'SITEMAP-MISSING-LIVE') {
      lines.push(`## ${n}. 🟡 [SITEMAP-MISSING-LIVE] \`${f.key}\` je live:true, ale chybí v sitemap`);
      lines.push('');
      lines.push(`**Návrh:** do \`astro.config.mjs\` \`customPages\` přidat: \`${f.expectedUrl}\``);
      lines.push('- [ ] (manuální — bez auto-fixu)');
      lines.push('');
    } else if (f.type === 'HEADERS-MISSING') {
      lines.push(`## ${n}. 🟡 [HEADERS-MISSING] \`${f.url}\` postrádá hlavičky`);
      lines.push('');
      lines.push(`**Chybí:** ${f.missing.map((m) => `\`${m}\``).join(', ')}`);
      lines.push('');
      lines.push('**Návrh:** na Mozku v `/etc/nginx/sites-enabled/davidnavratil.com` zajistit, že `include security-headers.conf;` je v každém `location` bloku obsluhujícím tuto cestu. Pak `nginx -t && systemctl reload nginx`.');
      lines.push('- [ ] (manuální — bez auto-fixu)');
      lines.push('');
    } else if (f.type === 'SUBROUTE-404') {
      lines.push(`## ${n}. 🔴 [SUBROUTE-404] \`${f.url}\` vrací ${f.status} (analýza \`${f.analysis}\`)`);
      lines.push('');
      lines.push('**Návrh:** zkontrolovat deploy příslušné analýzy. Buď chybí soubor v `/var/www/davidnavratil.com/analyses/`, nebo se změnil `trailingSlash` v Next.js configu a sub-route už neexistuje pod touto cestou.');
      lines.push('- [ ] (manuální — bez auto-fixu)');
      lines.push('');
    }
  });

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Running weekly audit...');
  const sitemapUrls = await readSitemapCustomPages();
  console.log(`Loaded ${sitemapUrls.length} customPages entries from astro.config.mjs`);

  await Promise.all([
    checkUrls(),
    checkImages(),
    checkSsl(),
    checkSitemapDead(sitemapUrls),
    checkHeaders(),
    checkSubroutes(),
  ]);
  // sitemap-missing-live is purely synchronous and depends on sitemapUrls — run after the parallel batch.
  checkSitemapMissingLive(sitemapUrls);

  if (findings.length === 0) {
    console.log('✓ No problems found. Audit passed.');
    return;
  }

  console.log(`Found ${findings.length} problem(s):`);
  for (const f of findings) {
    const key =
      'key' in f
        ? f.key
        : 'analysis' in f
          ? f.analysis
          : 'host' in f
            ? f.host
            : 'url' in f
              ? f.url
              : '?';
    console.log(`  - [${f.type}] ${key}`);
  }

  writeFileSync('/tmp/audit-findings.json', JSON.stringify(findings, null, 2));
  writeFileSync('/tmp/audit-issue.md', formatIssue(findings));
  console.log('Wrote /tmp/audit-findings.json and /tmp/audit-issue.md');
}

main().catch((err) => {
  console.error('Audit failed with exception:', err);
  process.exit(1);
});
