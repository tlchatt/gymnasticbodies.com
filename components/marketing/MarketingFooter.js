'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useMediaQuery } from '@/lib/MediaQueries';
import { ptToText } from '@/lib/portableText';

const SOCIAL_ICONS = {
    instagram: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
        </svg>
    ),
    youtube: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/>
        </svg>
    ),
    facebook: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
    ),
};

export default function MarketingFooter({ footerData = [] }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');

    const groups = footerData.filter(b => b._type === 'group');
    const socialBlock = footerData.find(b => b._type === 'social');
    const copyrightBlock = footerData.find(b => b._type === 'copyright');

    return (
        <footer style={{ backgroundColor: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)', padding: isLarge ? '4rem 2rem 2.5rem' : '3rem 1.25rem 2rem' }}>
            <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isLarge ? `200px repeat(${groups.length}, 1fr)` : '1fr 1fr', gap: '2rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: isLarge ? undefined : '1 / -1' }}>
                        <Link href="/" style={{ display: 'inline-flex' }}>
                            <Image src="/images/GFmarkandName.webp" alt="GymFit by Gymnastic Bodies" width={110} height={32} style={{ objectFit: 'contain' }} />
                        </Link>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', lineHeight: 1.6, maxWidth: '220px' }}>Restore mobility. Build real strength.</p>
                    </div>

                    {groups.map((group, i) => (
                        <div key={i}>
                            <div style={{ color: 'var(--text)', fontSize: '0.75rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                                {ptToText(group.label)}
                            </div>
                            {(group.links || []).map((link, j) => (
                                <a key={j} href={link.href || '#'} style={{ display: 'block', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.875rem', fontFamily: 'var(--font-body)', fontWeight: 400, padding: '0.25rem 0', lineHeight: 1.5 }}>
                                    {ptToText(link.text)}
                                </a>
                            ))}
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <p style={{ color: 'var(--text-subtle)', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>
                        {copyrightBlock ? ptToText(copyrightBlock.text) : `© ${new Date().getFullYear()} Gymnastic Bodies. All rights reserved.`}
                    </p>
                    {socialBlock && (
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {(socialBlock.links || []).map((link, i) => (
                                <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-subtle)', textDecoration: 'none', display: 'flex', alignItems: 'center' }} aria-label={link.platform}>
                                    {SOCIAL_ICONS[link.platform] || link.platform}
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </footer>
    );
}
