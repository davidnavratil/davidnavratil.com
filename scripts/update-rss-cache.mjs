#!/usr/bin/env node
/**
 * Fetches Substack RSS and updates the articles cache.
 * Used in CI before build so the cache stays fresh even when
 * Node.js fetch() can't reach Substack during Astro build.
 *
 * Usage: node scripts/update-rss-cache.mjs
 * Exit 0 on success or if fetch fails (cache stays as-is).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const CACHE_PATH = path.join(process.cwd(), 'src', 'data', 'articles-cache.json');
const FEED_URL = 'https://davidnavratil.substack.com/feed';

function parseRSS(xml) {
  const items = xml.split('<item>').slice(1, 7);
  return items.map((item) => {
    const getTag = (tag) => {
      const match = item.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`))
        || item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return match ? match[1].trim() : '';
    };

    const rawDesc = getTag('description');
    const cleanDesc = rawDesc
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
      .replace(/<[^>]+>/g, '')
      .slice(0, 160)
      .trim();

    const encMatch = item.match(/<enclosure[^>]+url="([^"]+)"/);
    let image = encMatch ? encMatch[1] : '';
    if (image && image.includes('substackcdn.com')) {
      image = image.replace(/,f_auto/, ',w_400,h_220,c_fill,f_auto');
    }

    return {
      title: getTag('title'),
      link: getTag('link'),
      pubDate: getTag('pubDate'),
      description: cleanDesc + (cleanDesc.length >= 157 ? '…' : ''),
      image,
    };
  });
}

try {
  // Try multiple fetch strategies — Substack blocks some CI user-agents/IPs
  let xml = '';

  // Strategy 1: Node.js native fetch (works in Node 22+)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Feedfetcher-Google; +http://www.google.com/feedfetcher.html)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    clearTimeout(timeout);
    if (res.ok) xml = await res.text();
  } catch { /* try next strategy */ }

  // Strategy 2: curl with different user-agent
  if (!xml) {
    try {
      xml = execSync(
        `curl -sL --max-time 15 --retry 2 --retry-delay 2 -H "Accept: application/rss+xml, application/xml, text/xml" -A "Feedfetcher-Google" "${FEED_URL}"`,
        { encoding: 'utf-8', timeout: 30000 }
      );
    } catch { /* try next strategy */ }
  }

  // Strategy 3: curl via a plain browser user-agent
  if (!xml) {
    try {
      xml = execSync(
        `curl -sL --max-time 15 -H "Accept: text/html,application/xhtml+xml" -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36" "${FEED_URL}"`,
        { encoding: 'utf-8', timeout: 25000 }
      );
    } catch { /* try next strategy */ }
  }

  // Strategy 4: fetch via own server (Substack blocks GitHub Actions IPs)
  if (!xml) {
    const sshKey = path.join(process.env.HOME || '/home/runner', '.ssh', 'id_ed25519');
    const hasSSH = fs.existsSync(sshKey);
    if (hasSSH) {
      try {
        console.log('⚡ Trying RSS fetch via production server proxy…');
        xml = execSync(
          `ssh -o ConnectTimeout=10 -o LogLevel=ERROR root@77.42.84.152 'curl -sf --max-time 10 "${FEED_URL}"'`,
          { encoding: 'utf-8', timeout: 25000 }
        );
        if (xml) console.log('✓ RSS fetched via server proxy');
      } catch (e) {
        console.log(`⚠ Server proxy failed: ${e.message?.slice(0, 80)}`);
      }
    } else {
      console.log(`ℹ No SSH key at ${sshKey}, skipping server proxy strategy`);
    }
  }

  if (!xml || !xml.includes('<item>')) {
    console.log('⚠ All fetch strategies failed or returned no RSS data, keeping existing cache');
    // Check cache staleness — warn if older than 3 days
    checkStaleness();
    process.exit(0);
  }

  const articles = parseRSS(xml);

  if (articles.length > 0) {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(articles, null, 2));
    console.log(`✓ RSS cache updated: ${articles.length} articles`);
  } else {
    console.log('⚠ RSS returned 0 articles, keeping existing cache');
    checkStaleness();
  }
} catch (e) {
  console.log(`⚠ RSS fetch failed (${e.message?.slice(0, 80)}), keeping existing cache`);
  checkStaleness();
}

function checkStaleness() {
  try {
    const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    if (cached.length > 0 && cached[0].pubDate) {
      const newest = new Date(cached[0].pubDate);
      const daysOld = (Date.now() - newest.getTime()) / (1000 * 60 * 60 * 24);
      if (daysOld > 3) {
        console.log(`::warning::RSS cache is ${Math.floor(daysOld)} days stale (newest article: ${cached[0].pubDate}). Substack feed fetch is failing in CI.`);
      }
    }
  } catch { /* no cache to check */ }
}
