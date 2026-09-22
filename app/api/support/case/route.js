// POST /api/support/case  { email, ask?, caseId? }
// Investigate (read-only) -> create a support_fires row -> post the play into Slack with the
// Accept/Edit/Regenerate/Reject buttons. This is the trigger the Gmail-push handler will call;
// exposed directly so we can drive an end-to-end test.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { investigate } from '@/lib/support/investigate';
import { extractPlay } from '@/lib/support/plays';
import { enrichPlay } from '@/lib/support/enrich';
import { slack, playBlocks, summaryBlocks, doneBlocks, SUPPORT_CHANNEL } from '@/lib/support/slack';
import { logger } from '@/lib/logger';

export const maxDuration = 120;
const sql = neon(process.env.DATABASE_URL);

// A reply that arrives after a case already has a Slack thread gets a FRESH thread (so it can't be
// missed at the bottom of an old one). This closes out the former thread and cross-links the two, so
// it's obvious which thread is live: the old parent is marked superseded and both carry a pointer.
async function markReopened({ caseId, newParentTs, priorFire }) {
  const ch = SUPPORT_CHANNEL;
  const [pNew, pOld] = await Promise.all([
    slack('chat.getPermalink', { channel: ch, message_ts: newParentTs }),
    slack('chat.getPermalink', { channel: ch, message_ts: priorFire.thread_ts }),
  ]);
  const newLink = pNew.ok ? `<${pNew.permalink}|the new thread>` : 'a new thread';
  const oldLink = pOld.ok ? `<${pOld.permalink}|previous thread>` : 'the previous thread';
  // Close the former thread: mark its parent superseded + drop a pointer inside it.
  await slack('chat.update', {
    channel: ch, ts: priorFire.thread_ts, text: 'Superseded — reopened',
    blocks: summaryBlocks(priorFire, null, '  ·  🔒 superseded — reopened'),
  });
  // If the old play was still awaiting review, strip its Accept button so nobody sends a stale reply
  // (only for 'posted' — a scheduled/fired play already owns its own buttons/state, leave it be).
  if (priorFire.status === 'posted' && priorFire.play_ts) {
    const pp = typeof priorFire.play === 'string' ? JSON.parse(priorFire.play || '{}') : (priorFire.play || {});
    await slack('chat.update', {
      channel: ch, ts: priorFire.play_ts, text: 'Superseded',
      blocks: doneBlocks(`🔒 *Superseded — the member replied; now handled in ${newLink}*`, priorFire, pp),
    });
  }
  await slack('chat.postMessage', {
    channel: ch, thread_ts: priorFire.thread_ts, text: 'Superseded',
    blocks: [{ type: 'context', elements: [{ type: 'mrkdwn', text: `🔒 *Closed here — superseded.* The member replied again; this case is now being handled in ${newLink}.` }] }],
  });
  // Mark the new thread as a continuation, pointing back.
  await slack('chat.postMessage', {
    channel: ch, thread_ts: newParentTs, text: `Follow-up on case #${caseId}`,
    blocks: [{ type: 'context', elements: [{ type: 'mrkdwn', text: `🔁 *Reopened* — follow-up on case #${caseId}. Previous discussion: ${oldLink}.` }] }],
  });
}

export async function POST(request) {
  let email, caseId;
  try {
    const body = await request.json();
    ({ email, caseId } = body);
    const { ask, threadTs } = body;
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const raw = await investigate({ email, ask });
    const play = extractPlay(raw);

    // Attach the customer's inbound message + contextual admin links (customer / message / case).
    await enrichPlay(play, email, { caseId });
    if (!play.customer_message && ask && !threadTs) play.customer_message = { subject: null, body: ask, date: null };

    const [f] = await sql`
      INSERT INTO support_fires (case_id, member_email, channel, status, response, actions, issue_class, play)
      VALUES (${caseId || null}, ${email.toLowerCase()}, ${SUPPORT_CHANNEL}, 'posted', ${play.response}, ${JSON.stringify(play.actions)}, ${play.issue_class || null}, ${JSON.stringify(play)})
      RETURNING id, case_id, run_id, member_email, response, status, issue_class`;

    // threadTs set = a regeneration triggered by a human reply: post the fresh play back into the
    // SAME thread (no new channel parent). Otherwise open a new case: compact parent + play in thread.
    let parentTs = threadTs;
    if (threadTs) {
      await slack('chat.postMessage', {
        channel: SUPPORT_CHANNEL, thread_ts: threadTs, text: `Updated play for ${email}`,
        blocks: [{ type: 'context', elements: [{ type: 'mrkdwn', text: '🔄 Updated suggestion based on your note.' }] }],
      });
    } else {
      // Did this case already have a Slack thread? A reply that lands now "reopens" it in a fresh thread.
      const [prior] = caseId
        ? await sql`SELECT id, thread_ts, play_ts, status, member_email, issue_class, play FROM support_fires
                     WHERE case_id=${caseId} AND thread_ts IS NOT NULL AND id <> ${f.id}
                     ORDER BY id DESC LIMIT 1`
        : [];
      const reopened = !!prior?.thread_ts;

      const parent = await slack('chat.postMessage', {
        channel: SUPPORT_CHANNEL, text: `Support case · ${email}`,
        blocks: summaryBlocks(f, play, reopened ? '  ·  🔁 reopened' : ''),
      });
      if (!parent.ok) throw new Error(`slack post failed: ${parent.error}`);
      parentTs = parent.ts;

      // Close out the former thread + cross-link — best-effort, never fail the fire over it.
      if (reopened) await markReopened({ caseId, newParentTs: parentTs, priorFire: prior }).catch(() => {});
    }
    // full play + buttons in the thread.
    const detail = await slack('chat.postMessage', {
      channel: SUPPORT_CHANNEL, thread_ts: parentTs, text: `Play for ${email}`, blocks: playBlocks(f, play),
    });
    // thread_ts = parent (fire results + human replies map here); play_ts = detail (Accept updates here).
    await sql`UPDATE support_fires SET thread_ts=${parentTs}, play_ts=${detail.ts}, updated_at=now() WHERE id=${f.id}`;

    return NextResponse.json({ ok: true, fireId: f.id, ts: parentTs, play });
  } catch (err) {
    // Log so a failed fire leaves a server-side trace (the caller retries once and also logs).
    logger.error('support.case.error', { email, caseId, error: err.message });
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
