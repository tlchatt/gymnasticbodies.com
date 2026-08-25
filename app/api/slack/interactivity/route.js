// POST /api/slack/interactivity  — Slack sends button clicks + modal submits here (form-encoded
// `payload=<json>`), signed with the signing secret. This is the "gate" surface: Accept arms the
// 5-minute fuse, Undo cancels, Reject drops, Edit tweaks the reply, Regenerate re-investigates.
// It never executes account changes — that's /api/support/fire (the deterministic back layer).
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifySlackSignature, slack, playBlocks, scheduledBlocks, doneBlocks, FIRE_MINUTES } from '@/lib/support/slack';
import { extractPlay } from '@/lib/support/plays';
import { scheduleFire } from '@/lib/support/fuse';

const sql = neon(process.env.DATABASE_URL);
const getFire = async (id) => (await sql`SELECT * FROM support_fires WHERE id=${id}`)[0];
const ack = () => new NextResponse('', { status: 200 });

export async function POST(request) {
  const raw = await request.text();
  if (!verifySlackSignature(raw, request.headers)) return new NextResponse('bad signature', { status: 401 });
  const payload = JSON.parse(new URLSearchParams(raw).get('payload'));

  try {
    if (payload.type === 'view_submission' && payload.view?.callback_id === 'edit_submit') {
      const id = Number(payload.view.private_metadata);
      const text = payload.view.state.values.r.text.value;
      await sql`UPDATE support_fires SET response=${text}, updated_at=now() WHERE id=${id}`;
      const f = await getFire(id);
      await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Support play (edited)', blocks: playBlocks(f, { ...playFromFire(f), response: text }) });
      return new NextResponse('', { status: 200 });
    }

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
      }
    } else if (action.action_id === 'undo') {
      const upd = await sql`UPDATE support_fires SET status='cancelled', updated_at=now() WHERE id=${f.id} AND status='scheduled' AND fire_at > now() RETURNING id`;
      if (upd.length) await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Cancelled', blocks: doneBlocks('↩️ Cancelled — nothing sent', f) });
    } else if (action.action_id === 'reject') {
      await sql`UPDATE support_fires SET status='rejected', updated_at=now() WHERE id=${f.id}`;
      await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Rejected', blocks: doneBlocks('🚫 Rejected', f) });
    } else if (action.action_id === 'edit') {
      await slack('views.open', {
        trigger_id: payload.trigger_id,
        view: {
          type: 'modal', callback_id: 'edit_submit', private_metadata: String(f.id),
          title: { type: 'plain_text', text: 'Edit reply' }, submit: { type: 'plain_text', text: 'Save' },
          blocks: [{ type: 'input', block_id: 'r', label: { type: 'plain_text', text: 'Reply to the member' },
            element: { type: 'plain_text_input', action_id: 'text', multiline: true, initial_value: f.response || '' } }],
        },
      });
    } else if (action.action_id === 'regen') {
      await sql`UPDATE support_fires SET status='awaiting', updated_at=now() WHERE id=${f.id}`;
      await slack('chat.update', { channel: f.channel, ts: f.play_ts, text: 'Regenerating', blocks: doneBlocks('🔄 Re-investigating… (repost incoming)', f) });
      // fire-and-forget re-investigation; reposts to the same thread when done
      fetch(`${baseUrl(request)}/api/support/case`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.member_email, ask: 'Re-investigate (regenerate).', caseId: f.case_id }) }).catch(() => {});
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
function baseUrl(request) {
  return process.env.SUPPORT_PUBLIC_URL || new URL(request.url).origin;
}
