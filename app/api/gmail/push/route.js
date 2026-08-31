// POST /api/gmail/push?token=<GMAIL_PUSH_TOKEN>
// Google Pub/Sub push target for Gmail notifications on the support mailbox. We don't need the
// payload — a ping just means "the mailbox changed", so we trigger the existing Gmail sync
// immediately (it lists new mail, cases it, and auto-fires the agent). No historyId bookkeeping;
// reuses everything. The 5-minute poll stays on as a safety net for any missed notification.
import { NextResponse, after } from 'next/server';

export const maxDuration = 120;

export async function POST(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!process.env.GMAIL_PUSH_TOKEN || token !== process.env.GMAIL_PUSH_TOKEN) {
    return new NextResponse('unauthorized', { status: 401 });
  }
  // Ack Pub/Sub fast (it retries on non-2xx); run the sync after the response via after().
  const base = process.env.SUPPORT_PUBLIC_URL || url.origin;
  after(async () => {
    try { await fetch(`${base}/api/admin/gmail/sync`, { headers: { 'x-cron-secret': process.env.CRON_SECRET } }); }
    catch { /* the 5-min poll will catch it */ }
  });
  return NextResponse.json({ ok: true });
}
