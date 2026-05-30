import s from './PageHeader.module.css';

/**
 * PageHeader — page title + optional actions row.
 *
 * Props:
 *   title:    string          — displayed as the h1
 *   children: ReactNode       — optional; renders in the right-side actions slot
 *
 * Usage:
 *   <PageHeader title="Support Inbox">
 *     <CtaButton size="sm" onClick={syncGmail}>Sync Gmail</CtaButton>
 *   </PageHeader>
 */
export default function PageHeader({ title, children }) {
  return (
    <div className={s.header}>
      <h1 className={s.title}>{title}</h1>
      {children && <div className={s.actions}>{children}</div>}
    </div>
  );
}
