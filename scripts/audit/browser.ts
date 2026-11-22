/**
 * Audit check 9: open every live analysis and the site's own pages in a real browser
 * (headless Chromium) and report what a visitor would hit but a plain HTTP probe never sees:
 *   - Content-Security-Policy violations (e.g. a script or stylesheet from a CDN the CSP blocks;
 *     this is how the Hormuz simulator broke in November 2026 while still returning 200),
 *   - JavaScript errors (uncaught exceptions, console.error),
 *   - failed requests for the page's own files (404/5xx on davidnavratil.com),
 *   - an empty page (almost no visible text after loading).
 *
 * Playwright is not a project dependency; the audit workflow installs it just for this run.
 * When it is missing (e.g. a local run without it), the check is skipped with a log line.
 */

export type BrowserFinding = {
  type: 'BROWSER-ERRORS';
  url: string;
  csp: string[];
  errors: string[];
  failed: string[];
  empty: boolean;
  fix: null;
};

/** Messages that are noise rather than a broken page. */
// Next.js prefetches /analyses/<slug>.txt?_rsc=… for client navigation; on a static export it is a
// harmless 404 (the browser falls back to a normal page load). "Failed to load resource" console lines
// carry no URL and duplicate the response check below, so they are dropped too.
const IGNORE = [/favicon\.ico/i, /ERR_ABORTED/i, /net::ERR_BLOCKED_BY_CLIENT/i, /\.txt\?_rsc=/, /^Failed to load resource/];
const ignored = (s: string) => IGNORE.some((r) => r.test(s));
const MAX_ITEMS = 5;

export async function checkInBrowser(urls: string[], host: string): Promise<BrowserFinding[]> {
  let chromium: any;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.log('Browser check skipped: playwright is not installed.');
    return [];
  }
  const browser = await chromium.launch();
  const out: BrowserFinding[] = [];
  try {
    for (const url of urls) {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
      await ctx.addInitScript(() => {
        (window as any).__csp = [];
        document.addEventListener('securitypolicyviolation', (e: any) => {
          (window as any).__csp.push(`${e.effectiveDirective} blocked ${e.blockedURI || 'inline'}`);
        });
      });
      const page = await ctx.newPage();
      const errors: string[] = [];
      const failed: string[] = [];
      page.on('pageerror', (e: Error) => errors.push(`exception: ${e.message}`));
      page.on('console', (m: any) => {
        if (m.type() === 'error' && !ignored(m.text())) errors.push(m.text().slice(0, 300));
      });
      page.on('requestfailed', (r: any) => {
        const u = r.url();
        if (new URL(u).host === host && !ignored(u) && !ignored(r.failure()?.errorText ?? '')) failed.push(`${u} (${r.failure()?.errorText})`);
      });
      page.on('response', (r: any) => {
        const u = r.url();
        if (r.status() >= 400 && new URL(u).host === host && !ignored(u)) failed.push(`${u} (${r.status()})`);
      });
      let csp: string[] = [];
      let empty = false;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(2000);
        // Lazy parts (charts, maps) often load only when scrolled into view
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1500);
        csp = await page.evaluate(() => (window as any).__csp ?? []);
        const textLen = await page.evaluate(() => (document.body?.innerText ?? '').trim().length);
        empty = textLen < 200;
      } catch (e) {
        errors.push(`page did not load: ${(e as Error).message.split('\n')[0]}`);
      }
      // CSP violations also show up as console errors; keep them in one list only
      const rest = errors.filter((e) => !/Content Security Policy/i.test(e));
      const cspAll = [...new Set([...csp, ...errors.filter((e) => /Content Security Policy/i.test(e)).map((e) => e.slice(0, 200))])];
      if (cspAll.length || rest.length || failed.length || empty) {
        out.push({
          type: 'BROWSER-ERRORS',
          url,
          csp: cspAll.slice(0, MAX_ITEMS),
          errors: [...new Set(rest)].slice(0, MAX_ITEMS),
          failed: [...new Set(failed)].slice(0, MAX_ITEMS),
          empty,
          fix: null,
        });
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  return out;
}

export function formatBrowserFinding(n: number, f: BrowserFinding): string[] {
  const l: string[] = [];
  const co: string[] = [];
  if (f.csp.length) co.push('CSP blokuje část stránky');
  if (f.errors.length) co.push('chyby JavaScriptu');
  if (f.failed.length) co.push('nenačtené soubory');
  if (f.empty) co.push('stránka je prázdná');
  l.push(`## ${n}. 🔴 [BROWSER] \`${f.url}\`: ${co.join(', ')}`);
  l.push('');
  if (f.csp.length) { l.push('**CSP:**'); f.csp.forEach((x) => l.push(`- \`${x}\``)); l.push(''); }
  if (f.errors.length) { l.push('**Chyby:**'); f.errors.forEach((x) => l.push(`- \`${x.replace(/`/g, "'")}\``)); l.push(''); }
  if (f.failed.length) { l.push('**Nenačteno:**'); f.failed.forEach((x) => l.push(`- \`${x}\``)); l.push(''); }
  l.push('**Návrh:** otevřít stránku v prohlížeči s konzolí. CSP: zdroj z CDN přenést do analýzy (zkompilovat, stáhnout), nebo ho povolit v CSP bloku analýzy v nginx (`server/nginx-davidnavratil.com.conf`). Nenačtené soubory: zkontrolovat poslední deploy analýzy.');
  l.push('- [ ] (manuální — bez auto-fixu)');
  l.push('');
  return l;
}
