// The deterministic back layer — shared fire logic. Runs the executors for a scheduled play whose
// 5-minute fuse elapsed, posts the result to the Slack thread, and (on each cron tick) refreshes the
// live countdown on every still-pending Undo card. NO AI, NO bot. The Slack Accept + undo window IS
// the authorization. Used by the per-minute cron (/api/support/fuse-tick) and the manual fire route.
import { neon } from '@neondatabase/serverless';
import { executePlay } from '@/lib/support/execute';
import { slack, doneBlocks, scheduledBlocks, summaryBlocks, FIRE_MINUTES } from '@/lib/support/slack';
import { scheduleFire } from '@/lib/support/fuse';

const sql = neon(process.env.DATABASE_URL);
const parseActions = (a) => (Array.isArray(a) ? a : (a ? JSON.parse(a) : []));
// Full stored play (findings, customer message, admin links) so every state keeps the conversation
// visible; falls back to fire-row fields for older fires that predate the stored play.
export const playOf = (f) => {
  let s = f.play; if (typeof s === 'string') { try { s = JSON.parse(s); } catch { s = null; } }
  return (s && typeof s === 'object') ? s : { response: f.response, actions: parseActions(f.actions), findings: '', issue_class: f.issue_class || 'other', open_questions: [] };
};

// The two human decisions on a play — Accept arms the 5-minute fuse, Undo cancels it before it
// elapses. Shared by the Slack buttons (/api/slack/interactivity) and the admin card
// (/api/support/fires/[id]/accept|undo), so both surfaces move the same row and the Slack card
// always shows the decision wherever it was made. Neither executes anything — fireOne does.
export async function acceptFire(id) {
  const [f] = await sql`SELECT * FROM support_fires WHERE id=${id}`;
  if (!f) return { ok: false, reason: 'not_found' };
  const fireAt = new Date(Date.now() + FIRE_MINUTES * 60000).toISOString();
  const upd = await sql`UPDATE support_fires SET status='scheduled', fire_at=${fireAt}, updated_at=now() WHERE id=${f.id} AND status='posted' RETURNING id`;
  if (!upd.length) return { ok: false, reason: 'not_awaiting_review', status: f.status, fire_at: f.fire_at };
  await scheduleFire(f.id, fireAt); // arms the durable fuse (Cloud Task) if configured
  if (f.channel && f.play_ts) await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Scheduled', blocks: scheduledBlocks(f, playOf(f), fireAt) });
  if (f.channel && f.thread_ts) await slack('chat.update', { channel: f.channel, ts: f.thread_ts, text: 'Scheduled', blocks: summaryBlocks({ ...f, status: 'scheduled' }) });
  return { ok: true, status: 'scheduled', fire_at: fireAt };
}

export async function undoFire(id) {
  const [f] = await sql`SELECT * FROM support_fires WHERE id=${id}`;
  if (!f) return { ok: false, reason: 'not_found' };
  const upd = await sql`UPDATE support_fires SET status='cancelled', updated_at=now() WHERE id=${f.id} AND status='scheduled' AND fire_at > now() RETURNING id`;
  if (!upd.length) return { ok: false, reason: 'not_undoable', status: f.status, fire_at: f.fire_at };
  if (f.channel && f.play_ts) await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Cancelled', blocks: doneBlocks('↩️ *Cancelled — nothing sent*', f, playOf(f)) });
  if (f.channel && f.thread_ts) await slack('chat.update', { channel: f.channel, ts: f.thread_ts, text: 'Cancelled', blocks: summaryBlocks({ ...f, status: 'cancelled' }) });
  return { ok: true, status: 'cancelled', fire_at: f.fire_at };
}

// Execute one scheduled fire (idempotent: claims the row first so a tick can't double-fire).
export async function fireOne(f) {
  const claimed = await sql`UPDATE support_fires SET status='firing', updated_at=now() WHERE id=${f.id} AND status='scheduled' RETURNING id`;
  if (!claimed.length) return { id: f.id, skipped: true };
  let result;
  try { result = await executePlay({ member_email: f.member_email, response: f.response, actions: f.actions, case_id: f.case_id }); }
  catch (e) { result = { ok: false, steps: [{ step: 'execute', ok: false, error: e.message }] }; }
  await sql`UPDATE support_fires SET status=${result.ok ? 'fired' : 'failed'}, result=${JSON.stringify(result)}, updated_at=now() WHERE id=${f.id}`;
  if (f.channel && f.thread_ts) {
    const lines = (result.steps || []).map((s) => `${s.ok ? '✅' : (s.skipped || s.held ? '⏸️' : '❌')} ${s.step}${s.error ? ': ' + s.error : (s.note ? ': ' + s.note : '')}`).join('\n');
    // A failed/unknown action HOLDS the customer reply (executePlay) — say so, never "Sent".
    const replyHeld = result.held === 'action_failed';
    await slack('chat.postMessage', { channel: f.channel, thread_ts: f.thread_ts, text: `${result.ok ? '✅ Fired' : (replyHeld ? '❌ Reply held — action failed' : '⚠️ Fired with issues')} — support play executed.\n${lines || '(nothing to do)'}` });
    const closed = (result.steps || []).some((s) => s.step === 'close_case' && s.ok);
    const escalated = (result.steps || []).some((s) => s.step === 'escalate' && s.ok);
    const banner = `${result.ok ? '✅ *Sent*' : (replyHeld ? '❌ *Reply held — action failed* (customer NOT emailed)' : '⚠️ *Sent with issues*')}${closed ? ' · case closed' : ''}${escalated ? ' · escalated to engineering' : ''}`;
    if (f.play_ts) await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: replyHeld ? 'Reply held — action failed' : 'Sent', blocks: doneBlocks(banner, f, playOf(f)) });
    // Update the top-level (parent) card status too: ✅ Sent (· case closed if the close ran).
    await slack('chat.update', { channel: f.channel, ts: f.thread_ts, text: replyHeld ? 'Reply held — action failed' : 'Sent', blocks: summaryBlocks({ ...f, status: result.ok ? 'fired' : (replyHeld ? 'held' : 'failed') }, null, closed ? '  ·  case closed' : '') });
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
      try { await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Scheduled', blocks: scheduledBlocks(f, playOf(f), f.fire_at) }); ticked++; } catch { /* ignore transient Slack errors */ }
    }
  }
  return { fired: fired.length, ticked, results: fired };
}
