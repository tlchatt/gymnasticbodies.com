'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './layout.module.css';

const NAV_ITEMS = [
  {
    href:  '/admin/inbox',
    label: 'Inbox',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
      </svg>
    ),
  },
  {
    href:  '/admin/outbox',
    label: 'Outbox',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
        <line x1="12" y1="4" x2="12" y2="1"/>
        <polyline points="9 4 12 1 15 4"/>
      </svg>
    ),
  },
  {
    href:  '/admin/cases',
    label: 'Cases',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
  },
  {
    href:  '/admin/users',
    label: 'Users',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href:  '/admin/pricing',
    label: 'Pricing',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    href:  '/admin/analytics',
    label: 'Analytics',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
  {
    href:  '/admin/component-guide',
    label: 'Components',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className={s.sidebar}>
      {/* ── Brand ── */}
      <div className={s.sidebarLogo}>
        <a href="https://my.gymnasticbodies.com/" className={s.logoLink}>
          <Image
            src="/images/GFmarkandName.webp"
            alt="GymFit by Gymnastic Bodies"
            width={120}
            height={34}
            style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.9 }}
          />
        </a>
        <span className={s.logoSub}>Admin</span>
      </div>

      {/* ── Navigation ── */}
      <nav className={s.nav} aria-label="Admin navigation">
        {NAV_ITEMS.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`${s.navLink}${pathname.startsWith(href) ? ` ${s.active}` : ''}`}
          >
            <span className={s.navIcon}>{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className={s.sidebarBottom}>app.gymnasticbodies.com</div>
    </aside>
  );
}
