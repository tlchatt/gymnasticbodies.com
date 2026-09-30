import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { neon } from '@neondatabase/serverless';
import { FORUM_PER_PAGE, FORUM_SPAM_TIDS } from '@/lib/forumConfig.mjs';
import hiddenPostIds from '@/data/forum/hiddenPostIds.json';

// Data layer for the read-only forum reader (Neon tables forum_categories /
// forum_topics / forum_posts, loaded once from the frozen Invision dump).
//
// What is public:
//   topic   = approved = 1 AND NOT spam AND its forum is_public AND it has >= 1 visible post
//   post    = POST_VISIBLE (below)
//   forum   = is_public AND at least one servable topic somewhere in its subtree

// THE single post-visibility rule. Every query that reads posts (topic pages, reply
// counts, page counts, last-activity ordering, forum totals, sitemap lastmod) uses
// this fragment against the alias `p` — change it here and it changes everywhere.
// Posts Invision itself did not show (moderator-hidden, deleted, unapproved — its
// per-post `queued` flag, which the import did not carry). forum_posts has no column
// for it, so the ids are listed in data/forum/hiddenPostIds.json
// (source: claudePlans/forum-hidden-posts-2026-09-30.json).
const HIDDEN_PIDS = hiddenPostIds.filter(Number.isInteger).join(',');
const POST_VISIBLE = `NOT p.spam AND p.pid <> ALL('{${HIDDEN_PIDS}}'::int[])`;

const TOPIC_APPROVED = 't.approved = 1 AND NOT t.spam';

// The data is frozen, so cached results only need refreshing if it is reloaded.
const DAY = 86400;

let client;
function query(text, params = []) {
    if (!client) client = neon(process.env.DATABASE_URL);
    return client.query(text, params);
}

// ---------- URLs ----------

// Paths are returned percent-encoded: a few dozen stored slugs carry non-ASCII
// characters, which are not valid in a redirect Location header as-is.
export function forumPath(forum, page = 1) {
    return encodeURI(`/forum/forum/${forum.id}-${forum.seo_slug}${page > 1 ? `/page/${page}` : ''}`);
}

export function topicPath(topic, page = 1) {
    return encodeURI(`/forum/topic/${topic.tid}-${topic.seo_slug}${page > 1 ? `/page/${page}` : ''}`);
}

// The path as requested, normalised the same way, so it can be compared to the canonical one.
function requestedPath(kind, slug, pageSegment) {
    let decoded = slug;
    try { decoded = decodeURIComponent(slug); } catch { /* keep the raw segment */ }
    return encodeURI(`/forum/${kind}/${decoded}${pageSegment === undefined ? '' : `/page/${pageSegment}`}`);
}

// "{id}-{slug}" -> numeric id. The slug part is cosmetic; the id is what matches.
export function parseIdSlug(segment) {
    const m = /^(\d{1,9})(?:-|$)/.exec(segment || '');
    return m ? parseInt(m[1], 10) : null;
}

export function parsePageNumber(segment) {
    return /^\d{1,6}$/.test(segment || '') ? parseInt(segment, 10) : null;
}

export function isSpamTopicId(tid) {
    return FORUM_SPAM_TIDS.includes(tid);
}

// ---------- Forum tree ----------

const loadForumRows = unstable_cache(
    () => query(`
        SELECT c.id, c.parent_id, c.title, c.seo_slug, c.position, c.is_public,
               COALESCE(s.topics, 0)::int AS topics,
               COALESCE(s.posts, 0)::int AS posts,
               s.last_post
        FROM forum_categories c
        LEFT JOIN (
            SELECT t.forum_id, COUNT(DISTINCT t.tid) AS topics, COUNT(p.pid) AS posts, MAX(p.post_date) AS last_post
            FROM forum_topics t
            JOIN forum_categories fc ON fc.id = t.forum_id AND fc.is_public
            JOIN forum_posts p ON p.tid = t.tid AND ${POST_VISIBLE}
            WHERE ${TOPIC_APPROVED}
            GROUP BY t.forum_id
        ) s ON s.forum_id = c.id
        ORDER BY c.position, c.id`),
    ['forum-tree-v2'],
    { revalidate: DAY, tags: ['forum'] },
);

// Every forum keyed by id, with children and subtree totals. `visible` is what the
// reader may show; non-visible forums are still present so redirects can find a parent.
export const getForumTree = cache(async () => {
    const rows = await loadForumRows();
    const byId = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
    const roots = [];
    for (const node of byId.values()) {
        const parent = byId.get(node.parent_id);
        if (parent) parent.children.push(node); else roots.push(node);
    }
    const total = (node) => {
        node.subtreeTopics = node.is_public ? node.topics : 0;
        for (const child of node.children) {
            total(child);
            if (node.is_public) node.subtreeTopics += child.subtreeTopics;
        }
        node.visible = node.is_public && node.subtreeTopics > 0;
    };
    roots.forEach(total);
    return { byId, roots };
});

// Breadcrumb chain, top-level category first.
export function forumAncestors(tree, forum) {
    const chain = [];
    let node = tree.byId.get(forum.parent_id);
    while (node) {
        chain.unshift(node);
        node = tree.byId.get(node.parent_id);
    }
    return chain;
}

// Top-level rows (parent_id = -1) are Invision categories: headings on the index,
// not pages of their own.
export function isCategory(forum) {
    return !forum || forum.parent_id === -1;
}

// Where a request for something we do not serve (a private or empty forum, an
// unapproved topic) should land: the nearest public forum above it, else the index.
export function nearestPublicPath(tree, forumId) {
    let node = tree.byId.get(forumId);
    while (node) {
        if (node.visible && !isCategory(node)) return forumPath(node);
        node = tree.byId.get(node.parent_id);
    }
    return '/forum';
}

// ---------- Forum listing ----------

export const getForumTopics = cache(async (forumId, page) => {
    const offset = (page - 1) * FORUM_PER_PAGE;
    return query(`
        SELECT t.tid, t.title, t.seo_slug, t.start_date, t.views, t.pinned, t.state,
               COALESCE(NULLIF(fp.author_name, ''), t.starter_name) AS starter,
               la.posts::int AS posts, la.last_post
        FROM forum_topics t
        JOIN LATERAL (
            SELECT COUNT(*) AS posts, MAX(p.post_date) AS last_post
            FROM forum_posts p WHERE p.tid = t.tid AND ${POST_VISIBLE}
        ) la ON true
        LEFT JOIN forum_posts fp ON fp.pid = t.first_pid
        WHERE t.forum_id = $1 AND ${TOPIC_APPROVED} AND la.posts > 0
        ORDER BY t.pinned DESC, la.last_post DESC, t.tid DESC
        LIMIT ${FORUM_PER_PAGE} OFFSET $2`, [forumId, offset]);
});

// ---------- Topic ----------

// The topic row whether or not it is servable — callers decide between render / redirect.
export const getTopic = cache(async (tid) => {
    const rows = await query(`
        SELECT t.tid, t.forum_id, t.title, t.seo_slug, t.start_date, t.views, t.state, t.approved, t.spam,
               COALESCE(NULLIF(fp.author_name, ''), t.starter_name) AS starter,
               (SELECT COUNT(*) FROM forum_posts p WHERE p.tid = t.tid AND ${POST_VISIBLE})::int AS posts
        FROM forum_topics t
        LEFT JOIN forum_posts fp ON fp.pid = t.first_pid
        WHERE t.tid = $1`, [tid]);
    return rows[0] || null;
});

export const getTopicPosts = cache(async (tid, page) => {
    const offset = (page - 1) * FORUM_PER_PAGE;
    return query(`
        SELECT p.pid, p.author_name, p.post_date, p.html
        FROM forum_posts p
        WHERE p.tid = $1 AND ${POST_VISIBLE}
        ORDER BY p.post_date, p.pid
        LIMIT ${FORUM_PER_PAGE} OFFSET $2`, [tid, offset]);
});

export function pageCount(total) {
    return Math.max(1, Math.ceil(total / FORUM_PER_PAGE));
}

// ---------- Page resolution (shared by the /x and /x/page/N routes) ----------
// Each returns one of:
//   { status: 'notFound' } | { status: 'redirect', to } | { status: 'ok', ... }

export const resolveForumPage = cache(async (slug, pageSegment) => {
    const id = parseIdSlug(slug);
    const page = pageSegment === undefined ? 1 : parsePageNumber(pageSegment);
    if (id === null || page === null || page < 1) return { status: 'notFound' };

    const tree = await getForumTree();
    const forum = tree.byId.get(id);
    if (!forum) return { status: 'notFound' };
    if (isCategory(forum)) return { status: 'redirect', to: '/forum' };
    if (!forum.visible) return { status: 'redirect', to: nearestPublicPath(tree, forum.parent_id) };

    const pages = pageCount(forum.topics);
    const canonical = forumPath(forum, Math.min(page, pages));
    const requested = requestedPath('forum', slug, pageSegment);
    if (requested !== canonical) return { status: 'redirect', to: canonical };

    const topics = await getForumTopics(forum.id, page);
    return { status: 'ok', tree, forum, page, pages, topics, canonical };
});

export const resolveTopicPage = cache(async (slug, pageSegment) => {
    const tid = parseIdSlug(slug);
    const page = pageSegment === undefined ? 1 : parsePageNumber(pageSegment);
    if (tid === null || page === null || page < 1 || isSpamTopicId(tid)) return { status: 'notFound' };

    const [tree, topic] = await Promise.all([getForumTree(), getTopic(tid)]);
    if (!topic || topic.spam) return { status: 'notFound' };

    const forum = tree.byId.get(topic.forum_id);
    const servable = topic.approved === 1 && forum?.is_public && topic.posts > 0;
    if (!servable) return { status: 'redirect', to: nearestPublicPath(tree, topic.forum_id) };

    const pages = pageCount(topic.posts);
    const canonical = topicPath(topic, Math.min(page, pages));
    const requested = requestedPath('topic', slug, pageSegment);
    if (requested !== canonical) return { status: 'redirect', to: canonical };

    // Page 1's first post feeds the meta description on every page of the topic.
    const [posts, firstPagePosts] = await Promise.all([
        getTopicPosts(tid, page),
        page === 1 ? null : getTopicPosts(tid, 1),
    ]);
    const firstPost = (firstPagePosts || posts)[0] || null;
    return { status: 'ok', tree, forum, topic, page, pages, posts, firstPost, canonical };
});

// ---------- Sitemap ----------

export async function getSitemapTopics() {
    return query(`
        SELECT t.tid, t.seo_slug, MAX(p.post_date) AS last_post
        FROM forum_topics t
        JOIN forum_categories c ON c.id = t.forum_id AND c.is_public
        JOIN forum_posts p ON p.tid = t.tid AND ${POST_VISIBLE}
        WHERE ${TOPIC_APPROVED}
        GROUP BY t.tid, t.seo_slug
        ORDER BY t.tid`);
}
