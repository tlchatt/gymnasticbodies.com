'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useMediaQuery } from '@/lib/MediaQueries';

export default function ExercisesClient({ exercises = [] }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const isSmall = useMediaQuery('(min-width: 640px)');
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return exercises;
        return exercises.filter((e) => e.title.toLowerCase().includes(q));
    }, [query, exercises]);

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: isLarge ? 'repeat(4, 1fr)' : isSmall ? 'repeat(2, 1fr)' : '1fr',
        gap: '1.25rem',
    };

    return (
        <section style={{ backgroundColor: 'var(--bg-base)', padding: isLarge ? '4.5rem 2rem 4rem' : '3.5rem 1.25rem 3rem' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <p style={{ color: 'var(--accent)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Gymnastic Bodies
                </p>
                <h1 style={{ color: 'var(--text)', fontSize: isLarge ? '3.25rem' : '2.25rem', fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                    Exercise Library
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontFamily: 'var(--font-body)', lineHeight: 1.6, maxWidth: '620px', marginBottom: '2rem' }}>
                    {exercises.length} bodyweight, ring, and mobility exercises — each with a full demonstration video and coaching notes.
                </p>

                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search exercises…"
                    style={{
                        width: '100%', maxWidth: '440px', padding: '0.8rem 1.1rem', marginBottom: '2.5rem',
                        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)', color: 'var(--text)', fontSize: '1rem',
                        fontFamily: 'var(--font-body)', outline: 'none',
                    }}
                />

                {filtered.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>No exercises match “{query}”.</p>
                ) : (
                    <div style={gridStyle}>
                        {filtered.map((e) => (
                            <Link
                                key={e.slug}
                                href={`/${e.slug}`}
                                style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', textDecoration: 'none' }}
                            >
                                {e.featuredImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={e.featuredImage} alt={e.title} loading="lazy" style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    <div style={{ width: '100%', aspectRatio: '4/3', backgroundColor: 'var(--bg-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span style={{ color: 'var(--text-subtle)', fontSize: '1.75rem' }}>🤸</span>
                                    </div>
                                )}
                                <div style={{ padding: '0.85rem 1rem', flex: 1, display: 'flex', alignItems: 'center' }}>
                                    <h3 style={{ color: 'var(--text)', fontSize: '0.92rem', fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.25, letterSpacing: '0.01em' }}>{e.title}</h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
