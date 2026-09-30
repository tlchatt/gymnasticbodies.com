import { getForumTree, getSitemapTopics, forumPath, topicPath, isCategory } from '@/lib/forum';
import { FORUM_SITE } from '@/lib/forumConfig.mjs';

// /forum/sitemap.xml — the forum index, every public forum, and every servable topic.
// www URLs without a trailing slash (the form that serves 200).
export const revalidate = 86400;

function entry(path, lastmod) {
    const date = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '';
    const loc = `${FORUM_SITE}${path}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<url><loc>${loc}</loc>${date}</url>`;
}

export async function GET() {
    const [tree, topics] = await Promise.all([getForumTree(), getSitemapTopics()]);
    const forums = [...tree.byId.values()].filter((forum) => forum.visible && !isCategory(forum));

    const urls = [
        entry('/forum'),
        ...forums.map((forum) => entry(forumPath(forum), forum.last_post)),
        ...topics.map((topic) => entry(topicPath(topic), topic.last_post)),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
