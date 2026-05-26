import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import CaseClient from './CaseClient';

export const metadata = { title: 'Case' };

export default async function CasePage({ params }) {
  const { id } = await params;
  const h = await headers();
  const host = h.get('host');
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  const res = await fetch(`${proto}://${host}/api/admin/cases/${id}`, {
    headers: Object.fromEntries(h),
    cache: 'no-store',
  });

  if (!res.ok) notFound();
  const data = await res.json();

  return <CaseClient data={data} />;
}
