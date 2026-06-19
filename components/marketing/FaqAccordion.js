'use client';
import { useState } from 'react';
import { useMediaQuery } from '@/lib/MediaQueries';
import { PortableText, ptToText } from '@/lib/portableText';

export default function FaqAccordion({ heading, items = [] }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const [openIndex, setOpenIndex] = useState(null);

    return (
        <section style={{ backgroundColor: 'var(--bg-base)', padding: isLarge ? '3.5rem 2rem' : '2rem 1.25rem' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
                {heading && (
                    <h2 style={{ color: 'var(--text)', fontSize: isLarge ? '2.5rem' : '1.75rem', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '2.5rem', textAlign: 'center' }}>
                        {ptToText(heading)}
                    </h2>
                )}
                {items.map((item, i) => {
                    const isOpen = openIndex === i;
                    return (
                        <div key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <button
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 0', cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left', color: isOpen ? 'var(--text)' : 'var(--text-muted)', fontSize: isLarge ? '1.1rem' : '1rem', fontFamily: 'var(--font-body)', fontWeight: 500, gap: '1rem' }}
                                onClick={() => setOpenIndex(isOpen ? null : i)}
                                aria-expanded={isOpen}
                            >
                                <span>{ptToText(item.question)}</span>
                                <span style={{ flexShrink: 0, color: 'var(--accent)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '1rem' }}>▾</span>
                            </button>
                            {isOpen && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.75, paddingBottom: '1.25rem' }}>
                                    <PortableText value={item.answer} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
