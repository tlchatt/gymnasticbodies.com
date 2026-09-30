import Link from 'next/link';
import ForumBreadcrumbs from './ForumBreadcrumbs';
import ForumPagination from './ForumPagination';
import { ForumRow } from './ForumIndexView';
import {
    sectionStyle, innerStyle, h1Style, cardStyle, metaStyle, titleLinkStyle, formatCount, formatForumDate,
} from './forumShared';

// topics: [{ tid, title, href, starter, startDate, replies, views }]
export default function ForumTopicListView({ title, crumbs, subforums, topics, page, pages, hrefFor, labels }) {
    const listStyle = { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' };
    const subforumListStyle = { ...listStyle, marginBottom: '1.75rem' };
    const rowStyle = {
        ...cardStyle,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.4rem 1.5rem',
        padding: '0.9rem 1.25rem',
    };
    const mainStyle = { flex: '1 1 20rem', minWidth: 0 };
    const startedStyle = { ...metaStyle, marginTop: '0.2rem' };
    const statsStyle = { ...metaStyle, flex: '0 0 auto' };

    return (
        <section style={sectionStyle}>
            <div style={innerStyle}>
                <ForumBreadcrumbs crumbs={crumbs} />
                <h1 style={h1Style}>{title}</h1>

                {subforums.length > 0 && (
                    <ul style={subforumListStyle}>
                        {subforums.map((forum) => <ForumRow key={forum.id} forum={forum} labels={labels} />)}
                    </ul>
                )}

                <ForumPagination page={page} pages={pages} hrefFor={hrefFor} labels={labels} />
                <ul style={listStyle}>
                    {topics.map((topic) => (
                        <li key={topic.tid} style={rowStyle}>
                            <div style={mainStyle}>
                                <Link href={topic.href} style={titleLinkStyle}>{topic.title}</Link>
                                <div style={startedStyle}>
                                    {labels.startedBy} {topic.starter}, {formatForumDate(topic.startDate)}
                                </div>
                            </div>
                            <div style={statsStyle}>
                                {formatCount(topic.replies)} {labels.replies} · {formatCount(topic.views)} {labels.views}
                            </div>
                        </li>
                    ))}
                </ul>
                <ForumPagination page={page} pages={pages} hrefFor={hrefFor} labels={labels} />
            </div>
        </section>
    );
}
