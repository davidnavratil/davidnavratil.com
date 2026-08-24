/**
 * Shared types for the comment collection & analysis system.
 *
 * The store lives ONLY on the server (/root/comments-data/store.json) —
 * never commit collected data into this public repo.
 */

export type Platform = 'substack' | 'linkedin' | 'x';
export type Sentiment = 'positive' | 'neutral' | 'critical' | 'negative';

export interface CommentAnalysis {
  sentiment: Sentiment;
  /** Max 3 topics, Czech, lowercase. */
  topics: string[];
  /** True only for substantive questions, informed critique or factual errors worth correcting. */
  needs_reply: boolean;
  /** Czech reply draft in David's voice; null when needs_reply is false. */
  reply_draft: string | null;
  /** One-line note why this comment matters (or null). */
  note: string | null;
  analyzed_at: string;
  model: string;
}

export interface CommentRecord {
  /** Dedup key: "<platform>:<post_id>:<comment_id>". */
  id: string;
  platform: Platform;
  post: {
    id: string;
    slug?: string;
    title: string;
    url: string;
  };
  comment_id: string;
  /** Parent comment_id for threaded replies, null for top-level. */
  parent_id: string | null;
  /** GDPR-lite: display name + public profile URL only. */
  author: { name: string; url?: string };
  body: string;
  /** ISO timestamp of the comment itself. */
  date: string;
  likes: number | null;
  lang: string | null;
  collected_at: string;
  source: 'substack-api' | 'manual';
  analysis: CommentAnalysis | null;
  replied: boolean;
}

export interface RunInsights {
  run_at: string;
  new_comments: number;
  /** 3–5 bullet points per analysis run. */
  bullets: string[];
}

export interface CommentStore {
  version: 1;
  updated_at: string;
  /** Inbox (n8n) line IDs already merged into comments[]. */
  ingested_inbox_ids: string[];
  comments: CommentRecord[];
}

export interface InsightsFile {
  version: 1;
  runs: RunInsights[];
}

export function emptyStore(): CommentStore {
  return {
    version: 1,
    updated_at: new Date().toISOString(),
    ingested_inbox_ids: [],
    comments: [],
  };
}
