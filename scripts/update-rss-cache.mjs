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
  // Use curl as it has better connectivity than Node.js fetch in CI
  const xml = execSync(`curl -sf --max-time 15 -A "Mozilla/5.0 (davidnavratil.com; RSS)" "${FEED_URL}"`, {
    encoding: 'utf-8',
    timeout: 20000,
  });

  const articles = parseRSS(xml);

  if (articles.length > 0) {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(articles, null, 2));
    console.log(`✓ RSS cache updated: ${articles.length} articles`);
  } else {
    console.log('⚠ RSS returned 0 articles, keeping existing cache');
  }
} catch (e) {
  console.log(`⚠ RSS fetch failed (${e.message?.slice(0, 80)}), keeping existing cache`);
}
