'use client';
import Link from 'next/link';
import { useMediaQuery } from '@/lib/MediaQueries';
import { PortableText, ptToText } from '@/lib/portableText';

// Shared hero for the marketing content pages (mobility, hey-newbies, think-stronger,
// body-weight, all-access). Matches the /subscribe + homepage hero
// language: orange glow, left-aligned italic Barlow headline, overline kicker, muted
// subtext, tight top padding so it sits right under the sticky nav.
//
// Supports an optional layered headline via hero.lines ([{ text, outline? }]); falls
// back to the plain hero.headline string (rendered italic, solid).
export default function ContentHero({ hero = {} }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const hasImage = !!hero.backgroundImage;

    const lines = Array.isArray(hero.lines) && hero.lines.length
        ? hero.lines
        : (ptToText(hero.headline) ? [{ text: ptToText(hero.headline) }] : []);

    const sectionStyle = {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
        // Equal top/bottom padding, consistent with the homepage hero.
        padding: isLarge ? '2.5rem 4rem' : '2rem 1.25rem',
        ...(hasImage && {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${hero.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }),
    };

    return (
        <section style={sectionStyle}>
            {!hasImage && (
                <div style={{ position: 'absolute', top: '-120px', left: '18%', width: '640px', height: '460px', maxWidth: '90vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(240,86,33,0.16) 0%, transparent 70%)', pointerEvents: 'none' }} />
            )}

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--content-max, 1160px)', margin: '0 auto' }}>
                {hero.overline && (
                    <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1.5rem' }}>
                        {ptToText(hero.overline)}
                    </span>
                )}

                {lines.length > 0 && (
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(2.75rem, 7vw, 5.5rem)', lineHeight: 0.92, color: 'var(--text)', margin: '0 0 1.5rem' }}>
                        {lines.map((ln, i) => (
                            <span
                                key={i}
                                style={ln.outline
                                    ? { display: 'block', WebkitTextStroke: '2px var(--accent)', color: 'transparent' }
                                    : { display: 'block' }}
                            >
                                {ln.text}
                            </span>
                        ))}
                    </h1>
                )}

                {hero.subtext && (
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: isLarge ? '1.15rem' : '1rem', lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: '520px', margin: '0 0 2.5rem' }}>
                        <PortableText value={hero.subtext} />
                    </div>
                )}

                {hero.ctaHref && hero.ctaText && (
                    <Link href={hero.ctaHref} style={{ display: 'inline-block', background: 'var(--gradient-cta)', color: '#fff', textDecoration: 'none', fontSize: isLarge ? '1.1rem' : '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, padding: isLarge ? '1rem 3rem' : '0.875rem 2.5rem', borderRadius: 'var(--radius-sm)', letterSpacing: '0.03em' }}>
                        {ptToText(hero.ctaText)}
                    </Link>
                )}
            </div>
        </section>
    );
}
