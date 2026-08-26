// GET /api/support/fuse-tick — the 5-minute fuse, driven by a per-minute Vercel cron.
// Each tick fires any scheduled play whose fire_at has elapsed (the deterministic back layer) and
// refreshes the live countdown on every still-pending Undo card. Auth: Vercel cron sends
// `Authorization: Bearer <CRON_SECRET>`; manual callers may use `x-cron-secret`.
import { NextResponse } from 'next/server';
import { sweepAndTick } from '@/lib/support/fire';

export const maxDuration = 120;

function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get('x-cron-secret') === secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

async function handle(request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const r = await sweepAndTick();
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
