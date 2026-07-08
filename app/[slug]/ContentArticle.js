'use client';
import { useMediaQuery } from '@/lib/MediaQueries';
import { PortableText } from '@/lib/portableText';

export default function ContentArticle({ page }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');

    return (
        <article style={{ backgroundColor: 'var(--bg-base)', padding: isLarge ? '4.5rem 2rem 3.5rem' : '3.5rem 1.25rem 2rem' }}>
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--text)', fontSize: isLarge ? '3rem' : '2.1rem', fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
                    {page.title}
                </h1>

                <div style={{ color: 'var(--text-muted)', fontSize: isLarge ? '1.05rem' : '1rem', fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.8 }}>
                    <PortableText value={page.content?.body || []} />
                </div>
            </div>
        </article>
    );
}
