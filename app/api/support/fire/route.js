// POST /api/support/fire  { fireId }   (or {} to sweep all due — manual/fallback)
// Manual trigger for the deterministic back layer. Normally the per-minute cron (/api/support/fuse-tick)
// fires scheduled plays; this route is kept for firing a single play by id or a manual sweep.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { fireOne, sweepAndTick } from '@/lib/support/fire';

export const maxDuration = 120;
const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const { fireId } = await request.json().catch(() => ({}));
    if (fireId) {
      const [f] = await sql`SELECT * FROM support_fires WHERE id=${fireId} AND status='scheduled'`;
      if (!f) return NextResponse.json({ ok: false, error: 'not found or not scheduled' }, { status: 404 });
      return NextResponse.json({ ok: true, result: await fireOne(f) });
    }
    // sweep: fire everything due + tick pending countdowns
    const r = await sweepAndTick();
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
