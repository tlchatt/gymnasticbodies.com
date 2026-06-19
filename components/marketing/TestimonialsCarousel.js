'use client';
import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@/lib/MediaQueries';
import { ptToText } from '@/lib/portableText';

export default function TestimonialsCarousel({ heading, testimonials = [] }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const trackRef = useRef(null);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        if (!testimonials.length) return;
        const id = setInterval(() => {
            setOffset(prev => {
                const track = trackRef.current;
                if (!track) return prev;
                const halfWidth = track.scrollWidth / 2;
                return prev >= halfWidth ? 0 : prev + 0.5;
            });
        }, 30);
        return () => clearInterval(id);
    }, [testimonials.length]);

    const items = [...testimonials, ...testimonials];

    return (
        <section style={{ backgroundColor: 'var(--bg-surface)', padding: isLarge ? '3.5rem 0' : '2rem 0', overflow: 'hidden' }}>
            {heading && (
                <div style={{ textAlign: 'center', marginBottom: '2.5rem', padding: '0 1.25rem' }}>
                    <h2 style={{ color: 'var(--text)', fontSize: isLarge ? '2.5rem' : '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
                        {ptToText(heading)}
                    </h2>
                </div>
            )}
            <div
                ref={trackRef}
                style={{ display: 'flex', gap: '1.25rem', transform: `translateX(-${offset}px)`, willChange: 'transform', width: 'max-content' }}
            >
                {items.map((t, i) => (
                    <div key={i} style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minWidth: '300px', maxWidth: '300px', flexShrink: 0 }}>
                        {t.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.imageUrl} alt={ptToText(t.name)} style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', display: 'block' }} loading="lazy" />
                        )}
                        <div style={{ padding: '1.25rem' }}>
                            {t.quote && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.65, marginBottom: '1rem', fontStyle: 'italic' }}>"{ptToText(t.quote)}"</p>}
                            <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.02em' }}>{ptToText(t.name)}</div>
                            {t.tagline && <div style={{ color: 'var(--accent)', fontSize: '0.75rem', fontFamily: 'var(--font-body)', marginTop: '0.2rem' }}>{ptToText(t.tagline)}</div>}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
