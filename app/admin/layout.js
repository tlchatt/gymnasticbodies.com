import { barlow, dm } from '@/lib/fonts';
import AdminNav from './AdminNav';
import s from './layout.module.css';

export const metadata = { title: { default: 'Admin', template: '%s | Admin' } };

export default function AdminLayout({ children }) {
  return (
    <div className={`${s.shell} ${barlow.variable} ${dm.variable}`}>
      <AdminNav />
      <div className={s.main}>
        <div className={s.content}>{children}</div>
      </div>
    </div>
  );
}
