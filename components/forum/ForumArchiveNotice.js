import { cardStyle } from './forumShared';

// The "this is a read-only archive" line at the top of every forum page.
// Text comes from data/content/forum.json (archiveNotice).
export default function ForumArchiveNotice({ text }) {
    if (!text) return null;

    const noticeStyle = {
        ...cardStyle,
        borderLeft: '3px solid var(--accent)',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        color: 'var(--text-dim)',
        fontSize: '0.9375rem',
        fontFamily: 'var(--font-body)',
        lineHeight: 1.5,
    };

    return <p style={noticeStyle}>{text}</p>;
}
