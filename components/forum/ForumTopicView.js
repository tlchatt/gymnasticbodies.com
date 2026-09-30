import ForumBreadcrumbs from './ForumBreadcrumbs';
import ForumPagination from './ForumPagination';
import {
    sectionStyle, innerStyle, h1Style, cardStyle, metaStyle, formatCount, formatForumDate,
} from './forumShared';

// posts: [{ pid, author, date, html }] — html is already sanitized (lib/forumHtml.js).
export default function ForumTopicView({ title, crumbs, starter, startDate, replies, views, posts, page, pages, hrefFor, labels }) {
    const topicTitleStyle = { ...h1Style, fontSize: 'clamp(1.7rem, 4.2vw, 2.6rem)', marginBottom: '0.75rem' };
    const summaryStyle = { ...metaStyle, marginBottom: '1.5rem' };
    const listStyle = { display: 'flex', flexDirection: 'column', gap: '0.75rem' };
    const postStyle = { ...cardStyle, padding: 'clamp(1rem, 3vw, 1.5rem)', scrollMarginTop: 'calc(var(--nav-height) + 1rem)' };
    const headerStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '0.25rem 1rem',
        paddingBottom: '0.75rem',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-default)',
    };
    const authorStyle = { color: 'var(--text)', fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 500, overflowWrap: 'anywhere' };
    const bodyStyle = {
        color: 'var(--text-muted)',
        fontSize: '1rem',
        fontFamily: 'var(--font-body)',
        fontWeight: 400,
        lineHeight: 1.7,
        overflowWrap: 'anywhere',
    };

    return (
        <section style={sectionStyle}>
            <div style={innerStyle}>
                <ForumBreadcrumbs crumbs={crumbs} />
                <h1 style={topicTitleStyle}>{title}</h1>
                <p style={summaryStyle}>
                    {labels.startedBy} {starter}, {formatForumDate(startDate)} · {formatCount(replies)} {labels.replies} · {formatCount(views)} {labels.views}
                </p>

                <ForumPagination page={page} pages={pages} hrefFor={hrefFor} labels={labels} />
                <div style={listStyle}>
                    {posts.map((post) => (
                        <article key={post.pid} id={`comment-${post.pid}`} style={postStyle}>
                            <header style={headerStyle}>
                                <span style={authorStyle}>{post.author}</span>
                                <time dateTime={new Date(post.date).toISOString()} style={metaStyle}>
                                    {labels.posted} {formatForumDate(post.date)}
                                </time>
                            </header>
                            <div style={bodyStyle} dangerouslySetInnerHTML={{ __html: post.html }} />
                        </article>
                    ))}
                </div>
                <ForumPagination page={page} pages={pages} hrefFor={hrefFor} labels={labels} />
            </div>
        </section>
    );
}
