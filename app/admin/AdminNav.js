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
        <Link href="/admin/users" className={active('/admin/users')}>
          <span className={s.navIcon}>👤</span> Users
        </Link>
      </nav>
      <div className={s.sidebarBottom}>app.gymnasticbodies.com</div>
    </aside>
  );
}
