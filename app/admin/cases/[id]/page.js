import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import CaseClient from './CaseClient';
import { listFires } from '@/lib/support/fireQueue';

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
  const fires = await listFires({ caseId: id, limit: 1 });

  return <CaseClient data={data} fires={fires} />;
}
