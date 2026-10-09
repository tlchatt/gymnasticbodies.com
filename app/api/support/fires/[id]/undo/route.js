// POST /api/support/fires/[id]/undo — the admin card's Undo (cancels before the fuse elapses).
// Same function the Slack button calls (lib/support/fire.js undoFire), so the row and the Slack card
// move together. Executes nothing — the fuse-tick cron fires the play via fireOne.
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { undoFire } from '@/lib/support/fire';
import { logger } from '@/lib/logger';

export async function POST(request, { params }) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const r = await undoFire(Number(id));
  logger.info('support.fire.undo', { email: user.email, userId: user.id, source: 'admin', fireId: Number(id), ok: r.ok, reason: r.reason || null });
  return NextResponse.json(r, { status: r.ok ? 200 : (r.reason === 'not_found' ? 404 : 409) });
}
