'use client';
import { useMediaQuery } from '@/lib/MediaQueries';
import { PortableText, ptToText } from '@/lib/portableText';

export default function ContentSection({ heading, body, image, accent = false }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');

    const sectionStyle = {
        backgroundColor: accent ? 'var(--bg-surface)' : 'var(--bg-base)',
        padding: isLarge ? '3.5rem 2rem' : '2rem 1.25rem',
    };

    const headingStyle = {
        color: 'var(--text)',
        fontSize: isLarge ? '2.5rem' : '1.75rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        lineHeight: 1.1,
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
        marginBottom: '1.5rem',
    };

    const bodyStyle = {
        color: 'var(--text-muted)',
        fontSize: isLarge ? '1.1rem' : '1rem',
        fontFamily: 'var(--font-body)',
        fontWeight: 400,
        lineHeight: 1.75,
    };

    return (
        <section style={sectionStyle}>
            <div style={{ maxWidth: image && isLarge ? '1100px' : '720px', margin: '0 auto', display: image && isLarge ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
                <div>
                    {heading && <h2 style={headingStyle}>{ptToText(heading)}</h2>}
                    {body && <div style={bodyStyle}><PortableText value={body} /></div>}
                </div>
                {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={ptToText(heading)} style={{ width: '100%', borderRadius: 'var(--radius-lg)', display: 'block', marginTop: isLarge ? 0 : '1.5rem', aspectRatio: '3/2', objectFit: 'cover' }} loading="lazy" />
                )}
            </div>
        </section>
    );
}
