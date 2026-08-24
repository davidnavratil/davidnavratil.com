/**
 * Substack comment collector.
 *
 * Enumerates posts via the public archive API, fetches comment trees for
 * posts that gained comments, normalizes them into the unified store and
 * writes the store back (server, or local file in prototype mode).
 *
 * Run: npx tsx scripts/comments/collect-substack.ts
 * Prototype: COMMENTS_FIXTURE=scripts/comments/fixtures/sample.json \
 *            COMMENTS_STORE_LOCAL=/tmp/comments-store.json \
 *            npx tsx scripts/comments/collect-substack.ts
 */

import { readFileSync } from 'node:fs';
import { fetchSubstackJson, loadStore, saveStore, sleep, SUBSTACK } from './lib.ts';
import type { CommentRecord, CommentStore } from './types.ts';

const ARCHIVE_PAGE_SIZE = 12;
const MAX_ARCHIVE_PAGES = 20; // safety cap (240 posts)
const RECHECK_DAYS = 30; // always re-check comments of posts younger than this

interface SubstackPost {
  id: string;
  slug?: string;
  title: string;
  url: string;
  comment_count: number | null;
  date: string | null;
}

// ----- normalization -----

/** Pick the first present, non-empty field from a loosely typed API object. */
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

/** Flatten a nested Substack comment tree into CommentRecords. */
function flattenComments(
  nodes: unknown[],
  post: SubstackPost,
  parentId: string | null,
  out: CommentRecord[],
): void {
  for (const node of nodes) {
    if (typeof node !== 'object' || node === null) continue;
    const c = node as Record<string, unknown>;
    const commentId = String(pick(c, ['id']) ?? '');
    const body = String(pick(c, ['body', 'text']) ?? '').trim();
    if (!commentId || !body) continue;

    const name = String(pick(c, ['name', 'author_name']) ?? 'Anonym');
    const handle = pick(c, ['handle']) as string | undefined;
    const likesRaw = pick(c, ['reaction_count', 'likes', 'reactions']);
    const likes =
      typeof likesRaw === 'number'
        ? likesRaw
        : typeof likesRaw === 'object' && likesRaw !== null
          ? Object.values(likesRaw as Record<string, number>).reduce((a, b) => a + (b || 0), 0)
          : null;

    out.push({
      id: `substack:${post.id}:${commentId}`,
      platform: 'substack',
      post: { id: post.id, slug: post.slug, title: post.title, url: post.url },
      comment_id: commentId,
      parent_id: parentId,
      author: {
        name,
        url: handle ? `https://substack.com/@${handle}` : undefined,
      },
      body,
      date: String(pick(c, ['date', 'created_at']) ?? new Date().toISOString()),
      likes,
      lang: null,
      collected_at: new Date().toISOString(),
      source: 'substack-api',
      analysis: null,
      replied: false,
    });

    const children = c.children;
    if (Array.isArray(children) && children.length) {
      flattenComments(children, post, commentId, out);
    }
  }
}

// ----- data sources -----

async function listPostsFromApi(): Promise<SubstackPost[]> {
  const posts: SubstackPost[] = [];
  for (let page = 0; page < MAX_ARCHIVE_PAGES; page++) {
    const url = `${SUBSTACK}/api/v1/archive?sort=new&offset=${page * ARCHIVE_PAGE_SIZE}&limit=${ARCHIVE_PAGE_SIZE}`;
    const batch = (await fetchSubstackJson(url)) as unknown[];
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const raw of batch) {
      const p = raw as Record<string, unknown>;
      const id = pick(p, ['id']);
      if (id === undefined) continue;
      posts.push({
        id: String(id),
        slug: pick(p, ['slug']) as string | undefined,
        title: String(pick(p, ['title']) ?? '(bez titulu)'),
        url: String(pick(p, ['canonical_url', 'url']) ?? `${SUBSTACK}/p/${pick(p, ['slug']) ?? ''}`),
        comment_count: (pick(p, ['comment_count']) as number | undefined) ?? null,
        date: (pick(p, ['post_date', 'published_at']) as string | undefined) ?? null,
      });
    }
    if (batch.length < ARCHIVE_PAGE_SIZE) break;
    await sleep(500);
  }
  return posts;
}

async function fetchCommentTree(postId: string): Promise<unknown[]> {
  const url = `${SUBSTACK}/api/v1/post/${postId}/comments?all_comments=true&sort=oldest_first`;
  const data = (await fetchSubstackJson(url)) as Record<string, unknown>;
  const comments = data?.comments;
  return Array.isArray(comments) ? comments : [];
}

// ----- fixture mode (local prototyping without network) -----

interface Fixture {
  posts: { post: SubstackPost; comments: unknown[] }[];
}

function collectFromFixture(path: string, store: CommentStore): CommentRecord[] {
  const fixture = JSON.parse(readFileSync(path, 'utf-8')) as Fixture;
  const collected: CommentRecord[] = [];
  for (const entry of fixture.posts) {
    flattenComments(entry.comments, entry.post, null, collected);
  }
  return collected;
}

// ----- main -----

async function main() {
  const store = loadStore();
  const known = new Map(store.comments.map((c) => [c.id, c]));
  const collected: CommentRecord[] = [];

  const fixturePath = process.env.COMMENTS_FIXTURE;
  if (fixturePath) {
    console.log(`Fixture mode: ${fixturePath}`);
    collected.push(...collectFromFixture(fixturePath, store));
  } else {
    const posts = await listPostsFromApi();
    console.log(`Archive: ${posts.length} posts`);

    // Re-fetch a post's comments only when its comment_count changed vs. what
    // we already hold, or when the post is recent (edits, late likes).
    const countsInStore = new Map<string, number>();
    for (const c of store.comments) {
      countsInStore.set(c.post.id, (countsInStore.get(c.post.id) ?? 0) + 1);
    }
    const cutoff = Date.now() - RECHECK_DAYS * 24 * 3600 * 1000;

    for (const post of posts) {
      const have = countsInStore.get(post.id) ?? 0;
      const isRecent = post.date ? new Date(post.date).getTime() > cutoff : true;
      const countChanged = post.comment_count !== null && post.comment_count !== have;
      if ((post.comment_count ?? 0) === 0 && have === 0) continue;
      if (!countChanged && !isRecent) continue;

      const tree = await fetchCommentTree(post.id);
      flattenComments(tree, post, null, collected);
      console.log(`  ${post.title}: ${tree.length} top-level comments`);
      await sleep(500);
    }
  }

  // Merge: new records are added with analysis:null; existing records only
  // refresh volatile fields (likes) and never lose their analysis.
  let added = 0;
  for (const rec of collected) {
    const existing = known.get(rec.id);
    if (existing) {
      existing.likes = rec.likes;
    } else {
      store.comments.push(rec);
      known.set(rec.id, rec);
      added++;
    }
  }

  saveStore(store);
  console.log(`Store: ${store.comments.length} comments total, ${added} new`);
}

main().catch((err) => {
  console.error('Collect failed:', err);
  process.exit(1);
});
