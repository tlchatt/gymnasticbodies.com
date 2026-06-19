'use client';
import Nav from '@/components/Nav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import { barlow, dm } from '@/lib/fonts';

export default function MarketingLayout({ navData, footerData, children }) {
    return (
        <div
            className={`${barlow.variable} ${dm.variable}`}
            style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', display: 'flex', flexDirection: 'column' }}
        >
            <Nav navData={navData || []} />
            <main style={{ flex: 1 }}>
                {children}
            </main>
            <MarketingFooter footerData={footerData || []} />
        </div>
    );
}
