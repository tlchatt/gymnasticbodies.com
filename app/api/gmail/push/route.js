// POST /api/gmail/push?token=<GMAIL_PUSH_TOKEN>
// Google Pub/Sub push target for Gmail notifications on the support mailbox. We don't need the
// payload — a ping just means "the mailbox changed", so we trigger the existing Gmail sync
// immediately (it lists new mail, cases it, and auto-fires the agent). No historyId bookkeeping;
// reuses everything. The 5-minute poll stays on as a safety net for any missed notification.
import { NextResponse, after } from 'next/server';
import { logger } from '@/lib/logger';

export const maxDuration = 120;

export async function POST(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (!process.env.GMAIL_PUSH_TOKEN || token !== process.env.GMAIL_PUSH_TOKEN) {
    return new NextResponse('unauthorized', { status: 401 });
  }
  // Record every real push so we can confirm event-driven delivery directly (not via sync timing).
  let hist = null;
  try { const b = await request.clone().json(); const d = b?.message?.data ? JSON.parse(Buffer.from(b.message.data, 'base64').toString('utf8')) : null; hist = d?.historyId ?? null; } catch { /* ignore */ }
  logger.info('gmail.push.received', { historyId: hist });
  // Ack Pub/Sub fast (it retries on non-2xx); run the sync after the response via after().
  const base = process.env.SUPPORT_PUBLIC_URL || url.origin;
  after(async () => {
    try { await fetch(`${base}/api/admin/gmail/sync`, { headers: { 'x-cron-secret': process.env.CRON_SECRET } }); }
    catch { /* the 5-min poll will catch it */ }
  });
  return NextResponse.json({ ok: true });
}
