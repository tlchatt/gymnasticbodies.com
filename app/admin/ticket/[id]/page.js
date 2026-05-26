import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import TicketClient from './TicketClient';

export const metadata = { title: 'Ticket' };

export default async function TicketPage({ params }) {
  const { id } = await params;
  const h = await headers();
  const host = h.get('host');
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  const res = await fetch(`${proto}://${host}/api/admin/tickets/${id}`, {
    headers: Object.fromEntries(h),
    cache: 'no-store',
  });

  if (!res.ok) notFound();
  const data = await res.json();

  return <TicketClient ticket={data.ticket} />;
}
