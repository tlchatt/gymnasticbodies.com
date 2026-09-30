import Link from 'next/link';
import { metaStyle } from './forumShared';

// Page numbers to show: first, last, and a window around the current page.
function pageWindow(page, pages) {
    const wanted = new Set([1, pages]);
    for (let n = page - 2; n <= page + 2; n++) if (n >= 1 && n <= pages) wanted.add(n);
    return [...wanted].sort((a, b) => a - b);
}

// hrefFor(n) -> URL of page n.
export default function ForumPagination({ page, pages, hrefFor, labels }) {
    if (pages <= 1) return null;

    const navStyle = {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem',
        margin: '1.25rem 0',
    };
    const linkStyle = {
        ...metaStyle,
        color: 'var(--text)',
        padding: '0.4rem 0.75rem',
        minWidth: '2.25rem',
        textAlign: 'center',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--bg-surface)',
    };
    const currentStyle = { ...linkStyle, color: 'var(--accent-light)', borderColor: 'var(--border-accent-strong)', fontWeight: 500 };
    const summaryStyle = { ...metaStyle, marginRight: '0.5rem' };

    const numbers = pageWindow(page, pages);

    return (
        <nav aria-label="Pagination" style={navStyle}>
            <span style={summaryStyle}>{labels.page} {page} {labels.of} {pages}</span>
            {page > 1 && <Link href={hrefFor(page - 1)} rel="prev" style={linkStyle}>{labels.prev}</Link>}
            {numbers.map((n, i) => (
                <span key={n} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {i > 0 && n - numbers[i - 1] > 1 && <span style={metaStyle} aria-hidden="true">…</span>}
                    {n === page
                        ? <span style={currentStyle} aria-current="page">{n}</span>
                        : <Link href={hrefFor(n)} style={linkStyle}>{n}</Link>}
                </span>
            ))}
            {page < pages && <Link href={hrefFor(page + 1)} rel="next" style={linkStyle}>{labels.next}</Link>}
        </nav>
    );
}
