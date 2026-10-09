import { forumProxy } from '@/lib/forumProxy';
import { forumReaderOn, FORUM_UPLOADS_BASE } from '@/lib/forumConfig.mjs';
import { phpbbTopicId, attachmentUrl } from '@/lib/forumLegacy';
import { getForumTree, getTopic, parseIdSlug, isSpamTopicId, isCategory, forumPath, topicPath, nearestPublicPath } from '@/lib/forum';

// Everything under /forum that is not one of the reader's own pages (index, a forum,
// a topic, the sitemap).
//
// Reader NOT live: reverse-proxy to the legacy Invision forum, exactly as before.
// Reader live: nothing on the old forum 404s — every old URL is sent somewhere real.
//   spam topics                       -> 410 Gone
//   legacy index.php?/topic/... forms -> 301 to the clean URL
//   phpBB viewtopic.php?t=N / ?p=N     -> 301 to the converted topic
//   attachment.php?id=N                -> 301 to the mirrored file
//   /forum/uploads/*                  -> 301 to the mirrored file (or proxied until mirrored)
//   profiles, search, login, etc.     -> 301 to the forum index

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Relative Location: the request URL seen here is the internal one behind the proxy.
function moved(path) {
    return new Response(null, { status: 301, headers: { Location: path } });
}

function gone() {
    return new Response('Gone', { status: 410 });
}

// Resolve a topic/forum id to the single URL it should live at (or 410 / 404).
async function topicResponse(tid) {
    if (isSpamTopicId(tid)) return gone();
    const [tree, topic] = await Promise.all([getForumTree(), getTopic(tid)]);
    if (!topic) return new Response('Not found', { status: 404 });
    if (topic.spam) return gone();
    const servable = topic.approved === 1 && tree.byId.has(topic.forum_id) && topic.posts > 0;
    return moved(servable ? topicPath(topic) : nearestPublicPath(tree, topic.forum_id));
}

async function forumResponse(id) {
    const tree = await getForumTree();
    const forum = tree.byId.get(id);
    if (!forum) return new Response('Not found', { status: 404 });
    if (isCategory(forum)) return moved('/forum');
    return moved(forum.visible ? forumPath(forum) : nearestPublicPath(tree, forum.parent_id));
}

async function readerRedirect(request, ctx) {
    const { path = [] } = await ctx.params;

    if (path[0] === 'uploads' && path.length > 1) {
        if (/^https?:\/\//.test(FORUM_UPLOADS_BASE)) {
            return moved(`${FORUM_UPLOADS_BASE}/${path.slice(1).map(encodeURIComponent).join('/')}`);
        }
        return forumProxy(request, ctx);
    }

    if (!['GET', 'HEAD'].includes(request.method)) return gone();

    const query = new URL(request.url).search;
    const last = path[path.length - 1] || '';
    if (/^viewtopic\.php$/i.test(last)) {
        const tid = phpbbTopicId(query);
        return tid ? topicResponse(tid) : moved('/forum');
    }
    if (/^attachment\.php$/i.test(last)) {
        const url = attachmentUrl(query);
        if (url) return moved(url);
    }

    // Deeper paths under a topic/forum (e.g. /topic/123-x/unread) -> the page itself.
    if (path[0] === 'topic' && parseIdSlug(path[1]) !== null) return topicResponse(parseIdSlug(path[1]));
    if (path[0] === 'forum' && parseIdSlug(path[1]) !== null) return forumResponse(parseIdSlug(path[1]));

    // Legacy query-string forms: index.php?/topic/123-slug/, index.php?showtopic=123,
    // index.php?/forum/22-slug/, index.php?showforum=22.
    let search = query;
    try { search = decodeURIComponent(search); } catch { /* keep the raw string */ }
    const topic = search.match(/\/topic\/(\d{1,9})(?:-|\/|&|$)/) || search.match(/[?&]showtopic=(\d{1,9})/);
    if (topic) return topicResponse(parseInt(topic[1], 10));
    const forum = search.match(/\/forum\/(\d{1,9})(?:-|\/|&|$)/) || search.match(/[?&]showforum=(\d{1,9})/);
    if (forum) return forumResponse(parseInt(forum[1], 10));

    return moved('/forum');
}

function handler(request, ctx) {
    return forumReaderOn() ? readerRedirect(request, ctx) : forumProxy(request, ctx);
}

export {
    handler as GET,
    handler as POST,
    handler as PUT,
    handler as DELETE,
    handler as PATCH,
    handler as HEAD,
    handler as OPTIONS,
};
