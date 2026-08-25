// POST /api/support/fire  { fireId }   (or {} to sweep all due — fallback fuse)
// The deterministic back layer: for a scheduled fire whose fuse elapsed, run the executors
// (reply/credit/grant/case-mgmt) and post the result to the Slack thread. Never AI, never the
// bot. Called by the Cloud Task at fire_at, or manually, or by a sweep.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { executePlay } from '@/lib/support/execute';
import { slack, doneBlocks } from '@/lib/support/slack';

export const maxDuration = 120;
const sql = neon(process.env.DATABASE_URL);

async function fireOne(f) {
  // claim to avoid double-fire
  const claimed = await sql`UPDATE support_fires SET status='firing', updated_at=now() WHERE id=${f.id} AND status='scheduled' RETURNING id`;
  if (!claimed.length) return { id: f.id, skipped: true };
  let result;
  try { result = await executePlay({ member_email: f.member_email, response: f.response, actions: f.actions, case_id: f.case_id }); }
  catch (e) { result = { ok: false, steps: [{ step: 'execute', ok: false, error: e.message }] }; }
  await sql`UPDATE support_fires SET status=${result.ok ? 'fired' : 'failed'}, result=${JSON.stringify(result)}, updated_at=now() WHERE id=${f.id}`;
  if (f.channel && f.thread_ts) {
    const lines = (result.steps || []).map((s) => `${s.ok ? '✅' : (s.note ? '⚠️' : '❌')} ${s.step}${s.error ? ': ' + s.error : (s.note ? ': ' + s.note : '')}`).join('\n');
    await slack('chat.postMessage', { channel: f.channel, thread_ts: f.thread_ts, text: `${result.ok ? '✅ Fired' : '⚠️ Fired with issues'} — support play executed.\n${lines || '(nothing to do)'}` });
    if (f.play_ts) await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Fired', blocks: doneBlocks(result.ok ? '✅ Fired' : '⚠️ Fired with issues', f) });
  }
  return { id: f.id, ...result };
}

export async function POST(request) {
  try {
    const { fireId } = await request.json().catch(() => ({}));
    if (fireId) {
      const [f] = await sql`SELECT * FROM support_fires WHERE id=${fireId} AND status='scheduled'`;
      if (!f) return NextResponse.json({ ok: false, error: 'not found or not scheduled' }, { status: 404 });
      return NextResponse.json({ ok: true, result: await fireOne(f) });
    }
    // sweep: fire everything due (fallback fuse)
    const due = await sql`SELECT * FROM support_fires WHERE status='scheduled' AND fire_at <= now() ORDER BY fire_at LIMIT 10`;
    const results = [];
    for (const f of due) results.push(await fireOne(f));
    return NextResponse.json({ ok: true, fired: results.length, results });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
