'use client';
import Link from 'next/link';
import { useMediaQuery } from '@/lib/MediaQueries';
import { PortableText, ptToText } from '@/lib/portableText';

export default function ContentHero({ hero = {} }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const isSmall = useMediaQuery('(min-width: 640px)');

    const hasImage = !!hero.backgroundImage;
    const sectionStyle = {
        backgroundColor: 'var(--bg-base)',
        padding: isLarge ? '7rem 2rem 3.5rem' : '5rem 1.25rem 2rem',
        textAlign: 'center',
        ...(hasImage && {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.62), rgba(0,0,0,0.72)), url(${hero.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }),
    };

    const headlineStyle = {
        color: 'var(--text)',
        fontSize: isLarge ? '4.5rem' : isSmall ? '3rem' : '2.25rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        lineHeight: 1.0,
        letterSpacing: '-0.02em',
        margin: '0 0 1.5rem',
        textTransform: 'uppercase',
    };

    const subtextStyle = {
        color: 'var(--text-muted)',
        fontSize: isLarge ? '1.2rem' : '1rem',
        fontFamily: 'var(--font-body)',
        fontWeight: 400,
        lineHeight: 1.7,
        margin: '0 0 2.5rem',
        maxWidth: '600px',
        marginLeft: 'auto',
        marginRight: 'auto',
    };

    return (
        <section style={sectionStyle}>
            <div style={{ maxWidth: '760px', margin: '0 auto' }}>
                {hero.overline && (
                    <span style={{ display: 'inline-block', color: 'var(--accent)', fontSize: '0.8rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                        {ptToText(hero.overline)}
                    </span>
                )}
                {ptToText(hero.headline) && (
                    <h1 style={headlineStyle}>{ptToText(hero.headline)}</h1>
                )}
                {hero.subtext && (
                    <div style={subtextStyle}>
                        <PortableText value={hero.subtext} />
                    </div>
                )}
                {hero.ctaHref && hero.ctaText && (
                    <Link href={hero.ctaHref} style={{ display: 'inline-block', background: 'var(--gradient-cta)', color: '#fff', textDecoration: 'none', fontSize: '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, padding: '0.875rem 2.5rem', borderRadius: 'var(--radius-sm)', letterSpacing: '0.03em' }}>
                        {ptToText(hero.ctaText)}
                    </Link>
                )}
            </div>
        </section>
    );
}
