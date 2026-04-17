/**
 * Audit fix executor.
 *
 * Triggered from the audit-fix.yml workflow when David comments `/fix` on an
 * audit issue. Reads the issue body from env.ISSUE_BODY (workflow sets this),
 * parses checkbox items, and applies the approved fixes. The workflow then
 * commits the changes and opens a PR.
 *
 * Env vars:
 *   ISSUE_BODY          — raw markdown body of the audit issue
 *   ISSUE_NUMBER        — issue number (for logging)
 *
 * A fix item in the body looks like:
 *   - [x] **auto-fix: flip-flag**
 *   <!-- fix-meta: {"type":"flip-flag","key":"qatar"} -->
 *
 * Only items that are BOTH checked AND have a fix-meta comment are executed.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

interface FixFlipFlag {
  type: 'flip-flag';
  key: string;
}
interface FixGenPlaceholder {
  type: 'gen-placeholder';
  key: string;
  title: string;
  subtitle?: string;
}
type FixAction = FixFlipFlag | FixGenPlaceholder;

const ROOT = resolve(import.meta.dirname, '..', '..');
const ANALYSES_PATH = resolve(ROOT, 'src', 'data', 'analyses.ts');
const IMAGES_DIR = resolve(ROOT, 'public', 'images');
const GEN_SCRIPT = resolve(import.meta.dirname, 'gen-placeholder.py');

function parseApprovedFixes(body: string): FixAction[] {
  const fixes: FixAction[] = [];
  // Split on "## " headings (each finding is one section)
  const sections = body.split(/^## /m).slice(1);
  for (const section of sections) {
    // Is there a checked checkbox for an auto-fix?
    const checked = /-\s*\[x\]\s*\*\*auto-fix/i.test(section);
    if (!checked) continue;
    const metaMatch = section.match(/<!--\s*fix-meta:\s*(\{[^}]*\})\s*-->/);
    if (!metaMatch) continue;
    try {
      const fix = JSON.parse(metaMatch[1]) as FixAction;
      fixes.push(fix);
    } catch (e) {
      console.warn('Skipping invalid fix-meta:', metaMatch[1], e);
    }
  }
  return fixes;
}

function flipFlagToFalse(key: string): boolean {
  const src = readFileSync(ANALYSES_PATH, 'utf-8');
  // Match the entry object for this key. Conservative regex:
  // matches a block from `key: '<key>'` through the next `},` allowing `live: true`
  // inside that block, and flips it.
  const entryRe = new RegExp(
    `(key:\\s*['"]${key}['"][\\s\\S]*?)(\\blive:\\s*)true(\\b[\\s\\S]*?\\},)`,
    'm',
  );
  if (!entryRe.test(src)) {
    console.warn(`flip-flag: no live:true found for key=${key}`);
    return false;
  }
  const updated = src.replace(entryRe, '$1$2false$3');
  writeFileSync(ANALYSES_PATH, updated);
  console.log(`flip-flag: ${key} → live:false`);
  return true;
}

function genPlaceholder(key: string, title: string, subtitle?: string): boolean {
  // Image filename: convert rozcestník key → file pattern used in analyses.ts
  // We read analyses.ts to find the image path for this key.
  const src = readFileSync(ANALYSES_PATH, 'utf-8');
  const re = new RegExp(`key:\\s*['"]${key}['"][\\s\\S]*?image:\\s*['"]([^'"]+)['"]`);
  const m = src.match(re);
  if (!m) {
    console.warn(`gen-placeholder: no image path found for key=${key}`);
    return false;
  }
  const imagePath = m[1]; // e.g. "/images/preview-trust.webp"
  const filename = imagePath.replace(/^\/images\//, '');
  const outPath = resolve(IMAGES_DIR, filename);
  try {
    execFileSync('python3', [GEN_SCRIPT, outPath, title, subtitle ?? ''], {
      stdio: 'inherit',
    });
    console.log(`gen-placeholder: wrote ${outPath}`);
    return true;
  } catch (e) {
    console.error(`gen-placeholder: failed for key=${key}:`, e);
    return false;
  }
}

function main() {
  const body = process.env.ISSUE_BODY ?? '';
  const issueNumber = process.env.ISSUE_NUMBER ?? '?';

  if (!body) {
    console.error('ISSUE_BODY env var is empty. Nothing to do.');
    process.exit(1);
  }

  const fixes = parseApprovedFixes(body);
  console.log(`Issue #${issueNumber}: ${fixes.length} approved fix(es).`);

  if (fixes.length === 0) {
    console.log('No approved fixes — exiting without changes.');
    return;
  }

  let applied = 0;
  for (const fix of fixes) {
    let ok = false;
    if (fix.type === 'flip-flag') {
      ok = flipFlagToFalse(fix.key);
    } else if (fix.type === 'gen-placeholder') {
      ok = genPlaceholder(fix.key, fix.title, fix.subtitle);
    } else {
      console.warn('Unknown fix type:', (fix as any).type);
    }
    if (ok) applied++;
  }

  console.log(`Applied ${applied}/${fixes.length} fix(es).`);
  if (applied === 0) process.exit(2); // no actual changes written
}

main();
