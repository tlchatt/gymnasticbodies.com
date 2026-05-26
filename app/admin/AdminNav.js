'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import s from './layout.module.css';

export default function AdminNav() {
  const pathname = usePathname();
  const active = (href) => pathname.startsWith(href) ? `${s.navLink} ${s.active}` : s.navLink;

  return (
    <aside className={s.sidebar}>
      <div className={s.sidebarLogo}>
        <h2>Gymfit</h2>
        <span>Admin</span>
      </div>
      <nav className={s.nav}>
        <Link href="/admin/inbox" className={active('/admin/inbox')}>
          <span className={s.navIcon}>✉</span> Inbox
        </Link>
        <Link href="/admin/cases" className={active('/admin/cases')}>
          <span className={s.navIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
            </svg>
          </span> Cases
        </Link>
        <Link href="/admin/users" className={active('/admin/users')}>
          <span className={s.navIcon}>👤</span> Users
        </Link>
      </nav>
      <div className={s.sidebarBottom}>app.gymnasticbodies.com</div>
    </aside>
  );
}
