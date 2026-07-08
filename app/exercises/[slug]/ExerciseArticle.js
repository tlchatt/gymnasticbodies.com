'use client';
import Link from 'next/link';
import { useMediaQuery } from '@/lib/MediaQueries';
import { PortableText } from '@/lib/portableText';

export default function ExerciseArticle({ exercise }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');

    return (
        <article style={{ backgroundColor: 'var(--bg-base)', padding: isLarge ? '4.5rem 2rem 3.5rem' : '3.5rem 1.25rem 2rem' }}>
            <div style={{ maxWidth: '820px', margin: '0 auto' }}>
                <Link
                    href="/exercises"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', marginBottom: '1.25rem' }}
                >
                    ← Exercise Library
                </Link>

                <h1 style={{ color: 'var(--text)', fontSize: isLarge ? '3rem' : '2.1rem', fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '1.75rem' }}>
                    {exercise.title}
                </h1>

                <div style={{ color: 'var(--text-muted)', fontSize: isLarge ? '1.05rem' : '1rem', fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.8 }}>
                    <PortableText value={exercise.content?.body || []} />
                </div>
            </div>
        </article>
    );
}
