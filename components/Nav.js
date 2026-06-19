'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useMediaQuery } from '@/lib/MediaQueries';
import { authClient } from '@/lib/auth-client';
import { ptToText } from '@/lib/portableText';

export default function Nav({ navData = [] }) {
    const [open, setOpen] = useState(false);
    const { data: session } = authClient.useSession();
    const user = session?.user;
    const isLarge = useMediaQuery('(min-width: 1024px)');

    const links = navData.filter(b => b._type === 'navLink' && b.variant !== 'ghost');
    const signInBlock = navData.find(b => b._type === 'navLink' && b.variant === 'ghost');
    const ctaBlock = navData.find(b => b._type === 'ctaButton');

    const navStyle = {
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(14,14,14,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        height: 'var(--nav-height)',
    };

    const innerStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
        maxWidth: 'var(--content-max)',
        margin: '0 auto',
        padding: isLarge ? '0 2rem' : '0 1.25rem',
    };

    const linksStyle = {
        display: isLarge ? 'flex' : open ? 'flex' : 'none',
        alignItems: isLarge ? 'center' : 'stretch',
        gap: isLarge ? '0.25rem' : 0,
        flexDirection: isLarge ? 'row' : 'column',
        ...(isLarge ? {} : {
            position: 'absolute',
            top: 'var(--nav-height)',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(14,14,14,0.97)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '1rem 1.25rem',
        }),
    };

    const linkStyle = {
        color: 'var(--text-muted)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        padding: isLarge ? '0.4rem 0.75rem' : '0.75rem 0',
        borderRadius: 'var(--radius-sm)',
        display: 'block',
        borderBottom: isLarge ? 'none' : '1px solid var(--border-subtle)',
    };

    const signInStyle = {
        color: 'var(--text-muted)',
        textDecoration: 'none',
        fontSize: '0.9rem',
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        padding: isLarge ? '0.4rem 0.75rem' : '0.75rem 0',
        display: 'block',
    };

    const ctaStyle = {
        background: 'var(--gradient-cta)',
        color: '#fff',
        textDecoration: 'none',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        padding: isLarge ? '0.5rem 1.25rem' : '0.75rem 0',
        borderRadius: 'var(--radius-sm)',
        letterSpacing: '0.02em',
        display: 'block',
        marginTop: isLarge ? 0 : '0.5rem',
        textAlign: isLarge ? undefined : 'center',
    };

    const hamburgerStyle = {
        display: isLarge ? 'none' : 'flex',
        flexDirection: 'column',
        gap: '5px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
    };

    const barBase = {
        width: '22px',
        height: '2px',
        backgroundColor: 'var(--text)',
        borderRadius: '2px',
        transition: 'transform 0.2s, opacity 0.2s',
        display: 'block',
    };

    return (
        <nav style={navStyle}>
            <div style={innerStyle}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none' }}>
                    <Image
                        src="/images/GFmarkandName.webp"
                        alt="GymFit by Gymnastic Bodies"
                        width={130}
                        height={38}
                        style={{ objectFit: 'contain' }}
                        priority
                    />
                </Link>

                <div style={linksStyle}>
                    {links.map((link, i) => (
                        <Link key={i} href={link.href || '#'} style={linkStyle}>
                            {ptToText(link.text)}
                        </Link>
                    ))}

                    {user ? (
                        <a href="https://my.gymnasticbodies.com" style={signInStyle}>
                            {user.name?.split(' ')[0] || 'Account'}
                        </a>
                    ) : signInBlock ? (
                        <a href={signInBlock.href || 'https://my.gymnasticbodies.com'} style={signInStyle}>
                            {ptToText(signInBlock.text)}
                        </a>
                    ) : null}

                    {ctaBlock && (
                        <Link href={ctaBlock.href || '/subscribe'} style={ctaStyle}>
                            {ptToText(ctaBlock.text)}
                        </Link>
                    )}
                </div>

                <button
                    style={hamburgerStyle}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    onClick={() => setOpen(v => !v)}
                >
                    <span style={{ ...barBase, transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
                    <span style={{ ...barBase, opacity: open ? 0 : 1 }} />
                    <span style={{ ...barBase, transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
                </button>
            </div>
        </nav>
    );
}
