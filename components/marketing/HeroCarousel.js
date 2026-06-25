'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ptToText } from '@/lib/ptUtils';
import { useMediaQuery } from '@/lib/MediaQueries';

const LINES = [
    'Move better',
    'Train smarter',
    'Get stronger',
    'Gymnastic Bodies',
    'Welcome to your new fitness adventure',
    'From beginner',
    'To advanced',
    'Set your body free',
];

const HOLD_MS = 2800;
const FADE_MS = 500;

export default function HeroCarousel({ hero = {} }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const isSmall = useMediaQuery('(min-width: 640px)');
    const [index, setIndex] = useState(0);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const holdTimer = setTimeout(() => setExiting(true), FADE_MS + HOLD_MS);
        const nextTimer = setTimeout(() => {
            setIndex(i => (i + 1) % LINES.length);
            setExiting(false);
        }, FADE_MS + HOLD_MS + FADE_MS);
        return () => { clearTimeout(holdTimer); clearTimeout(nextTimer); };
    }, [index]);

    const hasImage = !!hero.backgroundImage;

    const sectionStyle = {
        backgroundColor: 'var(--bg-base)',
        minHeight: isLarge ? '88vh' : '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: isLarge ? '2rem' : '1.25rem',
        ...(hasImage && {
            backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.55)), url(${hero.backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }),
    };

    const lineStyle = {
        color: 'var(--text)',
        fontSize: isLarge ? '6.5rem' : isSmall ? '4rem' : '2.75rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        lineHeight: 1.0,
        letterSpacing: '-0.02em',
        textTransform: 'uppercase',
        marginBottom: '3rem',
        animation: `heroFadeIn ${FADE_MS}ms ease forwards`,
        ...(exiting && {
            animation: 'none',
            opacity: 0,
            transform: 'translateY(-14px)',
            transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms ease`,
        }),
    };

    return (
        <>
            <style>{`
                @keyframes heroFadeIn {
                    from { opacity: 0; transform: translateY(14px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <section style={sectionStyle}>
                <div style={{ maxWidth: '960px', width: '100%' }}>
                    <div key={index} style={lineStyle}>
                        {LINES[index]}
                    </div>
                    {hero.ctaHref && (
                        <Link
                            href={hero.ctaHref}
                            style={{
                                display: 'inline-block',
                                background: 'var(--gradient-cta)',
                                color: '#fff',
                                textDecoration: 'none',
                                fontSize: isLarge ? '1.1rem' : '1rem',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                padding: isLarge ? '1rem 3rem' : '0.875rem 2rem',
                                borderRadius: 'var(--radius-sm)',
                                letterSpacing: '0.03em',
                            }}
                        >
                            {ptToText(hero.ctaText) || 'Start Free Trial →'}
                        </Link>
                    )}
                </div>
            </section>
        </>
    );
}
