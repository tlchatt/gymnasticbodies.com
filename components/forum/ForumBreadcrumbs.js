import Link from 'next/link';
import { metaStyle } from './forumShared';

// crumbs: [{ label, href? }] — the last entry is the current page.
export default function ForumBreadcrumbs({ crumbs }) {
    const listStyle = {
        ...metaStyle,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '0.5rem',
        listStyle: 'none',
        marginBottom: '1.25rem',
    };
    const linkStyle = { color: 'var(--text-dim)', textDecoration: 'underline' };
    const currentStyle = { color: 'var(--text)', overflowWrap: 'anywhere' };

    return (
        <nav aria-label="Breadcrumb">
            <ol style={listStyle}>
                {crumbs.map((crumb, i) => (
                    <li key={`${i}-${crumb.label}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {i > 0 && <span aria-hidden="true">›</span>}
                        {crumb.href
                            ? <Link href={crumb.href} style={linkStyle}>{crumb.label}</Link>
                            : <span style={i === crumbs.length - 1 ? currentStyle : undefined} aria-current={i === crumbs.length - 1 ? 'page' : undefined}>{crumb.label}</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
