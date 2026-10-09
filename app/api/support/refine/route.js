// POST /api/support/refine  { threadTs, note }
// Thin HTTP wrapper over runRefine (shared logic in lib/support/refine.js) so the refine can be
// driven manually / for testing. The Slack events path calls runRefine directly via after().
import { NextResponse } from 'next/server';
import { requireAdminOrCronSecret } from '@/lib/adminAuth';
import { runRefine } from '@/lib/support/refine';

export const maxDuration = 120;

export async function POST(request) {
  // Runs paid AI calls on any member's data and posts to the support Slack — admin or the
  // server's CRON_SECRET only (lib/support/autofire.js sends it).
  const denied = await requireAdminOrCronSecret(request);
  if (denied) return denied;
  try {
    const { threadTs, note } = await request.json();
    if (!threadTs || !note) return NextResponse.json({ error: 'threadTs and note required' }, { status: 400 });
    const result = await runRefine({ threadTs, note });
    return NextResponse.json(result, { status: result.ok ? 200 : 404 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
