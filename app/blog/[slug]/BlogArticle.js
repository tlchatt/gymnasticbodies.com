'use client';
import { useMediaQuery } from '@/lib/MediaQueries';
import { PortableText } from '@/lib/portableText';

export default function BlogArticle({ post }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');

    const formattedDate = post.publishedAt
        ? new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : null;

    return (
        <article style={{ backgroundColor: 'var(--bg-base)', padding: isLarge ? '5rem 2rem 3.5rem' : '4rem 1.25rem 2rem' }}>
            <div style={{ maxWidth: '760px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {post.category && <span style={{ color: 'var(--accent)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{post.category}</span>}
                    {formattedDate && <span style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>{formattedDate}</span>}
                </div>

                <h1 style={{ color: 'var(--text)', fontSize: isLarge ? '3rem' : '2rem', fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '1rem' }}>
                    {post.title}
                </h1>

                {post.author && (
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-subtle)' }}>
                        By {post.author}
                    </p>
                )}

                {post.featuredImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.featuredImage} alt={post.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 'var(--radius-lg)', marginBottom: '2.5rem', display: 'block' }} />
                )}

                <div style={{ color: 'var(--text-muted)', fontSize: isLarge ? '1.1rem' : '1rem', fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.8 }}>
                    <PortableText value={post.content?.body || []} />
                </div>
            </div>
        </article>
    );
}
