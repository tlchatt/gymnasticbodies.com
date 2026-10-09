import Link from 'next/link';
import ForumArchiveNotice from './ForumArchiveNotice';
import {
    sectionStyle, innerStyle, h1Style, cardStyle, metaStyle, titleLinkStyle, accentLinkStyle, formatCount,
} from './forumShared';

// One forum as a row: title, totals, and links to its visible subforums.
export function ForumRow({ forum, labels }) {
    const rowStyle = {
        ...cardStyle,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem 1.5rem',
        padding: '1rem 1.25rem',
    };
    const mainStyle = { flex: '1 1 18rem', minWidth: 0 };
    const subListStyle = { ...metaStyle, display: 'flex', flexWrap: 'wrap', gap: '0.25rem 0.75rem', marginTop: '0.4rem' };

    return (
        <li style={rowStyle}>
            <div style={mainStyle}>
                <Link href={forum.href} style={titleLinkStyle}>{forum.title}</Link>
                {forum.subforums.length > 0 && (
                    <div style={subListStyle}>
                        <span>{labels.subforums}:</span>
                        {forum.subforums.map((sub) => (
                            <Link key={sub.id} href={sub.href} style={accentLinkStyle}>{sub.title}</Link>
                        ))}
                    </div>
                )}
            </div>
            <div style={metaStyle}>
                {formatCount(forum.topics)} {labels.topics} · {formatCount(forum.posts)} {labels.posts}
            </div>
        </li>
    );
}

// categories: [{ id, title, forums: [{ id, title, href, topics, posts, subforums: [{ id, title, href }] }] }]
export default function ForumIndexView({ title, notice, categories, labels }) {
    const categoryStyle = { marginBottom: '2.25rem' };
    const categoryTitleStyle = {
        color: 'var(--accent-light)',
        fontSize: '1.25rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        marginBottom: '0.75rem',
    };
    const listStyle = { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' };

    return (
        <section style={sectionStyle}>
            <div style={innerStyle}>
                <ForumArchiveNotice text={notice} />
                <h1 style={h1Style}>{title}</h1>
                {categories.map((category) => (
                    <div key={category.id} style={categoryStyle}>
                        <h2 style={categoryTitleStyle}>{category.title}</h2>
                        <ul style={listStyle}>
                            {category.forums.map((forum) => <ForumRow key={forum.id} forum={forum} labels={labels} />)}
                        </ul>
                    </div>
                ))}
            </div>
        </section>
    );
}
