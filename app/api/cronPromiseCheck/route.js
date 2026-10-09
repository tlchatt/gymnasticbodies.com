// GET /api/cronPromiseCheck — daily check that what we told members (refunded, cancelled,
// credited, deleted, banned) is still true in Stripe + Neon. One Slack alert per mismatch, once.
// Logic: lib/promiseCheck.js. Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>`;
// manual callers may use `x-cron-secret`. `?dryRun=1` returns findings without posting or logging.
// `?days=N` widens/narrows the window (default 14).
import { NextResponse } from 'next/server';
import { runPromiseCheck } from '@/lib/promiseCheck';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get('x-cron-secret') === secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function handle(request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const dryRun = ['1', 'true', 'yes'].includes(String(searchParams.get('dryRun') || '').toLowerCase());
  const days = Math.min(90, Math.max(1, Number(searchParams.get('days')) || 14));
  try {
    const r = await runPromiseCheck({ dryRun, days });
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
