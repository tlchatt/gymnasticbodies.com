'use client';
import Link from 'next/link';
import { ptToText } from '@/lib/ptUtils';
import { useMediaQuery } from '@/lib/MediaQueries';

// Homepage hero — matches the /subscribe hero language: orange glow, left-aligned
// italic Barlow headline with one outlined (text-stroke) line, overline kicker,
// muted subtext, and tight top padding so content sits right under the sticky nav.
//
// Headline source (in priority order):
//   hero.lines    — array of { text, outline? } for the layered look
//   hero.headline — plain string fallback (rendered italic, solid)
export default function HeroCarousel({ hero = {} }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const hasImage = !!hero.backgroundImage;

    const lines = Array.isArray(hero.lines) && hero.lines.length
        ? hero.lines
        : (ptToText(hero.headline) ? [{ text: ptToText(hero.headline) }] : []);

    const sectionStyle = {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
        // The hero sits flush under the sticky nav — no top gap. The nav height is the
        // only thing above the hero. Content gets its breathing room from the inner
        // block's own vertical padding (below), applied equally top and bottom.
        padding: 0,
        ...(hasImage && {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${hero.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }),
    };

    return (
        <section style={sectionStyle}>
            {!hasImage && (
                <div style={{ position: 'absolute', top: '-120px', left: '18%', width: '700px', height: '500px', maxWidth: '90vw', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(240,86,33,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
            )}

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 'var(--content-max, 1160px)', margin: '0 auto', padding: isLarge ? '2.5rem 4rem' : '2rem 1.25rem' }}>
                {ptToText(hero.overline) && (
                    <span style={{ display: 'block', fontFamily: 'var(--font-body)', fontSize: '0.7rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1.5rem' }}>
                        {ptToText(hero.overline)}
                    </span>
                )}

                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase', fontSize: 'clamp(3.25rem, 9vw, 8rem)', lineHeight: 0.9, color: 'var(--text)', margin: '0 0 1.5rem' }}>
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

                {hero.subtext && (
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: isLarge ? '1.15rem' : '1rem', lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: '520px', margin: '0 0 2.5rem' }}>
                        <span>{ptToText(hero.subtext)}</span>
                    </div>
                )}

                {hero.ctaHref && (
                    <Link href={hero.ctaHref} style={{ display: 'inline-block', background: 'var(--gradient-cta)', color: '#fff', textDecoration: 'none', fontSize: isLarge ? '1.1rem' : '1rem', fontFamily: 'var(--font-display)', fontWeight: 700, padding: isLarge ? '1rem 3rem' : '0.875rem 2rem', borderRadius: 'var(--radius-sm)', letterSpacing: '0.03em' }}>
                        {ptToText(hero.ctaText) || 'Start Free Trial →'}
                    </Link>
                )}
            </div>
        </section>
    );
}
