#!/usr/bin/env node
/**
 * Post-build script: extracts SHA-256 hashes of all inline <script> tags
 * from dist/ HTML files and updates the nginx CSP header on the server.
 *
 * Usage: node scripts/update-csp-hashes.mjs [--dry-run]
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const DIST_DIR = new URL('../dist', import.meta.url).pathname;
const SERVER = 'root@77.42.84.152';
const NGINX_CONF = '/etc/nginx/sites-available/davidnavratil.com';
const DRY_RUN = process.argv.includes('--dry-run');

// Collect all HTML files
function findHtml(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...findHtml(p));
    else if (entry.name.endsWith('.html')) files.push(p);
  }
  return files;
}

// Extract inline script hashes
const hashes = new Set();
const scriptRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;

for (const file of findHtml(DIST_DIR)) {
  const html = readFileSync(file, 'utf8');
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    const raw = match[1];
    if (!raw.trim()) continue;
    // Hash the raw content (including whitespace) — browsers compute CSP hash on exact content
    const hash = createHash('sha256').update(raw).digest('base64');
    hashes.add(hash);
  }
}

const hashDirectives = [...hashes].map(h => `'sha256-${h}'`).join(' ');
console.log(`Found ${hashes.size} unique inline script hashes`);

// Build the full CSP header value
const csp = [
  "default-src 'self'",
  `script-src 'self' ${hashDirectives}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://substackcdn.com",
  "font-src 'self'",
  "connect-src 'self' https://plausible.io",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ') + ';';

console.log(`\nCSP header:\n${csp}\n`);

if (DRY_RUN) {
  console.log('[dry-run] Would update nginx CSP on server');
  process.exit(0);
}

// Update nginx config on server:
// 1. Write CSP value + python script to temp files
// 2. SCP both to server
// 3. Run python script on server
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

const tmpCsp = join(tmpdir(), 'csp-value.txt');
const tmpPy = join(tmpdir(), 'update-csp.py');

writeFileSync(tmpCsp, csp);
writeFileSync(tmpPy, `
import re

CONF_PATH = "${NGINX_CONF}"

with open("/tmp/csp-value.txt") as f:
    csp = f.read().strip()

with open(CONF_PATH) as f:
    conf = f.read()

new_line = f'add_header Content-Security-Policy "{csp}" always;'
conf = re.sub(r'add_header Content-Security-Policy ".*?" always;', new_line, conf)

with open(CONF_PATH, "w") as f:
    f.write(conf)

print("CSP updated in " + CONF_PATH)
`);

try {
  execSync(`scp ${tmpCsp} ${tmpPy} ${SERVER}:/tmp/`, { stdio: 'pipe' });
  unlinkSync(tmpCsp);
  unlinkSync(tmpPy);
  execSync(`ssh ${SERVER} 'python3 /tmp/update-csp.py'`, { stdio: 'inherit' });
  execSync(`ssh ${SERVER} 'nginx -t 2>&1 && systemctl reload nginx'`, { stdio: 'inherit' });
  console.log('✓ Nginx CSP updated and reloaded');
} catch (e) {
  console.error('✗ Failed to update nginx:', e.message);
  try { unlinkSync(tmpCsp); } catch {}
  try { unlinkSync(tmpPy); } catch {}
  process.exit(1);
}
