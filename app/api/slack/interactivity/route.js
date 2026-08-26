// POST /api/slack/interactivity  — Slack sends button clicks here (form-encoded `payload=<json>`),
// signed with the signing secret. This is the "gate" surface: Accept arms the 5-minute fuse, Undo
// cancels it. There is no Reject/Edit/Regenerate button anymore — to revise or ask the agent
// anything, a human just replies in the Slack thread (handled by /api/slack/events).
// This route never executes account changes — that's /api/support/fire (the deterministic back layer).
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifySlackSignature, slack, scheduledBlocks, doneBlocks, summaryBlocks, FIRE_MINUTES } from '@/lib/support/slack';
import { scheduleFire } from '@/lib/support/fuse';

const sql = neon(process.env.DATABASE_URL);
const getFire = async (id) => (await sql`SELECT * FROM support_fires WHERE id=${id}`)[0];
const ack = () => new NextResponse('', { status: 200 });

export async function POST(request) {
  const raw = await request.text();
  if (!verifySlackSignature(raw, request.headers)) return new NextResponse('bad signature', { status: 401 });
  const payload = JSON.parse(new URLSearchParams(raw).get('payload'));

  try {
    const action = payload.actions?.[0];
    if (!action) return ack();
    const f = await getFire(Number(action.value));
    if (!f) return ack();

    if (action.action_id === 'accept') {
      const fireAt = new Date(Date.now() + FIRE_MINUTES * 60000).toISOString();
      const upd = await sql`UPDATE support_fires SET status='scheduled', fire_at=${fireAt}, updated_at=now() WHERE id=${f.id} AND status='posted' RETURNING id`;
      if (upd.length) {
        await scheduleFire(f.id, fireAt); // arms the durable fuse (Cloud Task) if configured
        await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Scheduled', blocks: scheduledBlocks(f, playFromFire(f), fireAt) });
        if (f.thread_ts) await slack('chat.update', { channel: f.channel, ts: f.thread_ts, text: 'Scheduled', blocks: summaryBlocks({ ...f, status: 'scheduled' }) });
      }
    } else if (action.action_id === 'undo') {
      const upd = await sql`UPDATE support_fires SET status='cancelled', updated_at=now() WHERE id=${f.id} AND status='scheduled' AND fire_at > now() RETURNING id`;
      if (upd.length) {
        await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Cancelled', blocks: doneBlocks('↩️ Cancelled — nothing sent', f) });
        if (f.thread_ts) await slack('chat.update', { channel: f.channel, ts: f.thread_ts, text: 'Cancelled', blocks: summaryBlocks({ ...f, status: 'cancelled' }) });
      }
    }
    return ack();
  } catch (e) {
    console.error('[interactivity]', e.message);
    return ack(); // always 200 so Slack doesn't show an error to the user
  }
}

// The play for rendering: response is stored on the fire; actions come from the stored jsonb.
function playFromFire(f) {
  return { response: f.response, actions: Array.isArray(f.actions) ? f.actions : (f.actions ? JSON.parse(f.actions) : []), findings: '', issue_class: '—', open_questions: [] };
}
