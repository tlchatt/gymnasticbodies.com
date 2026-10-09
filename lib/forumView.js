import { cache } from 'react';
import content from '@/data/content/forum.json';
import {
    getForumTree, resolveForumPage, resolveTopicPage, forumAncestors, isCategory, forumPath, topicPath,
} from '@/lib/forum';
import { renderPostHtml, postExcerpt } from '@/lib/forumHtml';

// Turns forum data (lib/forum.js) into the plain props the presentational views in
// components/forum take, plus page metadata. Shared by the /x and /x/page/N routes.

const { siteName, indexTitle, archiveNotice, labels } = content;

function forumRow(node) {
    return {
        id: node.id,
        title: node.title,
        href: forumPath(node),
        topics: node.topics,
        posts: node.posts,
        subforums: node.children
            .filter((child) => child.visible)
            .map((child) => ({ id: child.id, title: child.title, href: forumPath(child) })),
    };
}

function visibleChildRows(node) {
    return node.children.filter((child) => child.visible).map(forumRow);
}

// Index > category (plain text — categories have no page) > parent forums > current.
function crumbsFor(tree, forum, currentLabel) {
    const crumbs = [{ label: labels.forums, href: '/forum' }];
    for (const ancestor of forumAncestors(tree, forum)) {
        if (isCategory(ancestor)) crumbs.push({ label: ancestor.title });
        else if (ancestor.visible) crumbs.push({ label: ancestor.title, href: forumPath(ancestor) });
    }
    if (currentLabel) {
        crumbs.push({ label: forum.title, href: forumPath(forum) });
        crumbs.push({ label: currentLabel });
    } else {
        crumbs.push({ label: forum.title });
    }
    return crumbs;
}

function pageSuffix(page) {
    return page > 1 ? ` - ${labels.page} ${page}` : '';
}

export const forumIndexMetadata = {
    title: { absolute: `${indexTitle} - ${siteName}` },
    alternates: { canonical: '/forum' },
};

export async function loadForumIndexView() {
    const tree = await getForumTree();
    const categories = tree.roots
        .filter((root) => root.visible)
        .map((root) => ({ id: root.id, title: root.title, forums: visibleChildRows(root) }));
    return { title: indexTitle, notice: archiveNotice, categories, labels };
}

// -> { status: 'notFound' } | { status: 'redirect', to } | { status: 'ok', metadata, props }
export const loadForumListingView = cache(async (slug, pageSegment) => {
    const result = await resolveForumPage(slug, pageSegment);
    if (result.status !== 'ok') return result;
    const { tree, forum, page, pages, topics, canonical } = result;

    return {
        status: 'ok',
        metadata: {
            title: { absolute: `${forum.title}${pageSuffix(page)} - ${siteName}` },
            alternates: { canonical },
        },
        props: {
            notice: archiveNotice,
            title: forum.title,
            crumbs: crumbsFor(tree, forum),
            subforums: page === 1 ? visibleChildRows(forum) : [],
            topics: topics.map((topic) => ({
                tid: topic.tid,
                title: topic.title,
                href: topicPath(topic),
                starter: topic.starter,
                startDate: topic.start_date,
                replies: Math.max(0, topic.posts - 1),
                views: topic.views,
            })),
            page,
            pages,
            hrefFor: (n) => forumPath(forum, n),
            labels,
        },
    };
});

export const loadTopicView = cache(async (slug, pageSegment) => {
    const result = await resolveTopicPage(slug, pageSegment);
    if (result.status !== 'ok') return result;
    const { tree, forum, topic, page, pages, posts, firstPost, canonical } = result;

    return {
        status: 'ok',
        metadata: {
            title: { absolute: `${topic.title}${pageSuffix(page)} - ${forum.title} - ${siteName}` },
            description: postExcerpt(firstPost?.html) || undefined,
            alternates: { canonical },
            openGraph: { title: topic.title, type: 'article', url: canonical },
        },
        props: {
            notice: archiveNotice,
            title: topic.title,
            crumbs: crumbsFor(tree, forum, topic.title),
            starter: topic.starter,
            startDate: topic.start_date,
            replies: Math.max(0, topic.posts - 1),
            views: topic.views,
            posts: posts.map((post) => ({
                pid: post.pid,
                author: post.author_name,
                date: post.post_date,
                html: renderPostHtml(post.html, labels.said),
            })),
            page,
            pages,
            hrefFor: (n) => topicPath(topic, n),
            labels,
        },
    };
});
