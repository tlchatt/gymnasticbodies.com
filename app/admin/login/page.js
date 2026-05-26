import { Suspense } from 'react';
import { barlow, dm } from '@/lib/fonts';
import LoginClient from './LoginClient';
import s from './login.module.css';

export const metadata = { title: 'Admin Login' };

export default function LoginPage() {
  return (
    <div className={`${s.page} ${barlow.variable} ${dm.variable}`}>
      <Suspense>
        <LoginClient />
      </Suspense>
    </div>
  );
}
