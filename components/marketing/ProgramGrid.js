'use client';
import Link from 'next/link';
import { useMediaQuery } from '@/lib/MediaQueries';
import { ptToText } from '@/lib/portableText';

const DEFAULT_PROGRAMS = [
    { slug: '/hey-newbies', label: 'Hey Newbies', description: 'Start here. Zero experience required.', icon: '🌱' },
    { slug: '/think-stronger', label: 'Think Stronger', description: 'Progressive gymnastic strength training.', icon: '💪' },
    { slug: '/mobility', label: 'Mobility', description: 'Restore range of motion in every joint.', icon: '🔄' },
    { slug: '/body-weight', label: 'Body Weight', description: 'No equipment. No excuses. Train anywhere.', icon: '⚡' },
    { slug: '/all-access', label: 'All Access', description: 'Every program. Every exercise. One price.', icon: '🏆', featured: true },
];

export default function ProgramGrid({ heading, subtext, programs }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const isSmall = useMediaQuery('(min-width: 640px)');

    const items = programs || DEFAULT_PROGRAMS;

    const sectionStyle = {
        backgroundColor: 'var(--bg-base)',
        padding: isLarge ? '3.5rem 2rem' : '2rem 1.25rem',
    };

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: isLarge ? 'repeat(5, 1fr)' : isSmall ? 'repeat(2, 1fr)' : '1fr',
        gap: isLarge ? '1rem' : '0.75rem',
    };

    const cardStyle = (featured) => ({
        backgroundColor: featured ? 'rgba(240,86,33,0.08)' : 'var(--bg-surface)',
        border: `1px solid ${featured ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        textDecoration: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        transition: 'border-color 0.2s, background-color 0.2s',
    });

    return (
        <section style={sectionStyle}>
            <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
                {(heading || subtext) && (
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        {heading && (
                            <h2 style={{ color: 'var(--text)', fontSize: isLarge ? '3rem' : '2rem', fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                {ptToText(heading)}
                            </h2>
                        )}
                        {subtext && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                                {ptToText(subtext)}
                            </p>
                        )}
                    </div>
                )}
                <div style={gridStyle}>
                    {items.map((program, i) => (
                        <Link key={i} href={program.slug} style={cardStyle(program.featured)}>
                            {program.icon && <span style={{ fontSize: '1.75rem', lineHeight: 1, marginBottom: '0.25rem' }}>{program.icon}</span>}
                            <span style={{ color: 'var(--text)', fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.02em' }}>
                                {ptToText(program.label) || program.label}
                            </span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.5 }}>
                                {ptToText(program.description) || program.description}
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
