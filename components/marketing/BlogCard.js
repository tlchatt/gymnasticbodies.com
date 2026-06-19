'use client';
import Link from 'next/link';

export default function BlogCard({ slug, title, excerpt, featuredImage, category, publishedAt }) {
    const formattedDate = publishedAt
        ? new Date(publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <Link href={`/${slug}`} style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', textDecoration: 'none', transition: 'border-color 0.2s' }}>
            {featuredImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={featuredImage} alt={title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} loading="lazy" />
            ) : (
                <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: 'var(--text-subtle)', fontSize: '2rem' }}>📝</span>
                </div>
            )}
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {category && <span style={{ color: 'var(--accent)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{category}</span>}
                    {formattedDate && <span style={{ color: 'var(--text-subtle)', fontSize: '0.72rem', fontFamily: 'var(--font-body)' }}>{formattedDate}</span>}
                </div>
                <h3 style={{ color: 'var(--text)', fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.3, letterSpacing: '0.01em' }}>{title}</h3>
                {excerpt && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{excerpt}</p>}
            </div>
        </Link>
    );
}
