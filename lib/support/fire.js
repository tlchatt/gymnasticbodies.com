// The deterministic back layer — shared fire logic. Runs the executors for a scheduled play whose
// 5-minute fuse elapsed, posts the result to the Slack thread, and (on each cron tick) refreshes the
// live countdown on every still-pending Undo card. NO AI, NO bot. The Slack Accept + undo window IS
// the authorization. Used by the per-minute cron (/api/support/fuse-tick) and the manual fire route.
import { neon } from '@neondatabase/serverless';
import { executePlay } from '@/lib/support/execute';
import { slack, doneBlocks, scheduledBlocks, summaryBlocks } from '@/lib/support/slack';

const sql = neon(process.env.DATABASE_URL);
const parseActions = (a) => (Array.isArray(a) ? a : (a ? JSON.parse(a) : []));

// Execute one scheduled fire (idempotent: claims the row first so a tick can't double-fire).
export async function fireOne(f) {
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
    // Update the top-level (parent) card status too: ✅ Sent (· case closed if the close ran).
    const closed = (result.steps || []).some((s) => s.step === 'close_case' && s.ok);
    await slack('chat.update', { channel: f.channel, ts: f.thread_ts, text: 'Sent', blocks: summaryBlocks({ ...f, status: result.ok ? 'fired' : 'failed' }, null, closed ? '  ·  case closed' : '') });
  }
  return { id: f.id, ...result };
}

// One cron tick: fire everything whose fuse elapsed; refresh the countdown card on everything still
// pending so the Undo card ticks down 5→4→3→2→1 minute.
export async function sweepAndTick() {
  const scheduled = await sql`SELECT * FROM support_fires WHERE status='scheduled' ORDER BY fire_at LIMIT 50`;
  const now = Date.now();
  const fired = [];
  let ticked = 0;
  for (const f of scheduled) {
    if (f.fire_at && new Date(f.fire_at).getTime() <= now) {
      fired.push(await fireOne(f));
    } else if (f.play_ts && f.channel) {
      const play = { response: f.response, actions: parseActions(f.actions) };
      try { await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Scheduled', blocks: scheduledBlocks(f, play, f.fire_at) }); ticked++; } catch { /* ignore transient Slack errors */ }
    }
  }
  return { fired: fired.length, ticked, results: fired };
}
