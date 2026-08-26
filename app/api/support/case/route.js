// POST /api/support/case  { email, ask?, caseId? }
// Investigate (read-only) -> create a support_fires row -> post the play into Slack with the
// Accept/Edit/Regenerate/Reject buttons. This is the trigger the Gmail-push handler will call;
// exposed directly so we can drive an end-to-end test.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { investigate } from '@/lib/support/investigate';
import { extractPlay } from '@/lib/support/plays';
import { enrichPlay } from '@/lib/support/enrich';
import { slack, playBlocks, summaryBlocks, SUPPORT_CHANNEL } from '@/lib/support/slack';

export const maxDuration = 120;
const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const { email, ask, caseId, threadTs } = await request.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const raw = await investigate({ email, ask });
    const play = extractPlay(raw);

    // Attach the customer's inbound message + contextual admin links (customer / message / case).
    await enrichPlay(play, email, { caseId });
    if (!play.customer_message && ask && !threadTs) play.customer_message = { subject: null, body: ask, date: null };

    const [f] = await sql`
      INSERT INTO support_fires (case_id, member_email, channel, status, response, actions, issue_class)
      VALUES (${caseId || null}, ${email.toLowerCase()}, ${SUPPORT_CHANNEL}, 'posted', ${play.response}, ${JSON.stringify(play.actions)}, ${play.issue_class || null})
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
      const parent = await slack('chat.postMessage', {
        channel: SUPPORT_CHANNEL, text: `Support case · ${email}`, blocks: summaryBlocks(f, play),
      });
      if (!parent.ok) throw new Error(`slack post failed: ${parent.error}`);
      parentTs = parent.ts;
    }
    // full play + buttons in the thread.
    const detail = await slack('chat.postMessage', {
      channel: SUPPORT_CHANNEL, thread_ts: parentTs, text: `Play for ${email}`, blocks: playBlocks(f, play),
    });
    // thread_ts = parent (fire results + human replies map here); play_ts = detail (Accept updates here).
    await sql`UPDATE support_fires SET thread_ts=${parentTs}, play_ts=${detail.ts}, updated_at=now() WHERE id=${f.id}`;

    return NextResponse.json({ ok: true, fireId: f.id, ts: parentTs, play });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
