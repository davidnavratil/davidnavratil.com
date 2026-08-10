#!/usr/bin/env node
/**
 * Deploys server/snippets/security-headers.conf to the production nginx and
 * verifies that the browser-visible headers actually changed.
 *
 * Usage: node scripts/update-csp.mjs [--dry-run] [--verify-only]
 *
 * ---------------------------------------------------------------------------
 * History — why this script was rewritten (2026-08-10)
 *
 * The predecessor (update-csp-hashes.mjs) computed SHA-256 hashes of inline
 * scripts and wrote them into /etc/nginx/sites-available/davidnavratil.com.
 * Two things made that a no-op:
 *
 *   1. /etc/nginx/sites-enabled/davidnavratil.com is a regular file, not a
 *      symlink to sites-available. nginx loads sites-enabled/*, so everything
 *      written to sites-available was never read.
 *   2. Even in the enabled config, HTML pages get their headers from
 *      snippets/security-headers.conf (see the note in that file), and that
 *      snippet uses 'unsafe-inline' — which makes script hashes meaningless.
 *
 * The visible consequence: a `form-action 'self'` directive silently blocked
 * every contact-form submission from 2026-04-03 until this was found, because
 * nothing ever checked what the server actually sends. Hence VERIFY below:
 * this script fails loudly if the deployed header is not what we shipped.
 * ---------------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';

const SERVER = 'root@77.42.84.152';
const REMOTE_SNIPPET = '/etc/nginx/snippets/security-headers.conf';
const LOCAL_SNIPPET = new URL('../server/snippets/security-headers.conf', import.meta.url).pathname;
const VERIFY_URL = 'https://davidnavratil.com/';

const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify-only');

const sh = (cmd, opts = {}) => execSync(cmd, { stdio: 'pipe', encoding: 'utf8', ...opts });

/** Pull the CSP value out of the snippet so we can assert against it later. */
function expectedCsp(source) {
  const match = source.match(/add_header\s+Content-Security-Policy\s+"([^"]+)"/);
  if (!match) throw new Error('No Content-Security-Policy add_header found in the snippet');
  return match[1].trim();
}

/**
 * Compare CSPs directive by directive rather than as strings: nginx and
 * intermediaries are free to normalise whitespace, and a false alarm here
 * would block deploys for no reason.
 */
function normalise(csp) {
  return csp
    .split(';')
    .map((d) => d.trim().replace(/\s+/g, ' '))
    .filter(Boolean)
    .sort()
    .join('; ');
}

async function liveCsp() {
  const res = await fetch(VERIFY_URL, { method: 'HEAD', cache: 'no-store' });
  return res.headers.get('content-security-policy');
}

async function verify(expected) {
  const live = await liveCsp();
  if (!live) throw new Error(`No Content-Security-Policy header on ${VERIFY_URL}`);

  if (normalise(live) !== normalise(expected)) {
    console.error('\n✗ Deployed CSP does not match the snippet.');
    console.error(`  expected: ${expected}`);
    console.error(`  live:     ${live}`);
    throw new Error('CSP verification failed');
  }

  // Belt and braces: the contact form is the site's only conversion path, and
  // it is exactly what silently broke last time. Assert its transport directly.
  const connectSrc = live.split(';').find((d) => d.trim().startsWith('connect-src')) ?? '';
  if (!connectSrc.includes('https://formspree.io')) {
    throw new Error(`connect-src does not permit https://formspree.io — the contact form will fail. Got: ${connectSrc.trim()}`);
  }

  console.log(`✓ Live CSP on ${VERIFY_URL} matches the snippet`);
  console.log('✓ connect-src permits https://formspree.io (contact form can submit)');
}

const source = readFileSync(LOCAL_SNIPPET, 'utf8');
const csp = expectedCsp(source);

if (VERIFY_ONLY) {
  await verify(csp);
  process.exit(0);
}

console.log(`Deploying ${LOCAL_SNIPPET}\n  -> ${SERVER}:${REMOTE_SNIPPET}`);
console.log(`\nCSP:\n${csp}\n`);

if (DRY_RUN) {
  console.log('[dry-run] Nothing was uploaded. Verifying the currently live header instead:');
  const live = await liveCsp();
  console.log(`live: ${live}`);
  console.log(normalise(live ?? '') === normalise(csp) ? '\n✓ already in sync' : '\n! live header differs from the snippet');
  process.exit(0);
}

const tmpLocal = join(tmpdir(), 'security-headers.conf');
writeFileSync(tmpLocal, source);

try {
  sh(`scp ${tmpLocal} ${SERVER}:/tmp/security-headers.conf`);

  // Back up, install, validate, and roll back automatically if nginx rejects it.
  // A bad snippet would take down every vhost that includes it, so this must
  // never leave the server in a state where `nginx -t` fails.
  sh(
    `ssh ${SERVER} '` +
      `cp ${REMOTE_SNIPPET} ${REMOTE_SNIPPET}.bak && ` +
      `cp /tmp/security-headers.conf ${REMOTE_SNIPPET} && ` +
      `if nginx -t 2>/dev/null; then systemctl reload nginx; echo INSTALLED; ` +
      `else cp ${REMOTE_SNIPPET}.bak ${REMOTE_SNIPPET}; echo ROLLED_BACK; nginx -t; exit 1; fi'`,
    { stdio: 'inherit' },
  );

  console.log('✓ Snippet installed, nginx reloaded');
} catch (e) {
  console.error('✗ Failed to install the snippet:', e.message);
  process.exit(1);
} finally {
  try { unlinkSync(tmpLocal); } catch {}
}

// nginx reload is graceful; give in-flight workers a moment to retire.
await new Promise((r) => setTimeout(r, 2000));

try {
  await verify(csp);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
