// POST /api/support/case  { email, ask?, caseId? }
// Investigate (read-only) -> create a support_fires row -> post the play into Slack with the
// Accept/Edit/Regenerate/Reject buttons. This is the trigger the Gmail-push handler will call;
// exposed directly so we can drive an end-to-end test.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { investigate } from '@/lib/support/investigate';
import { extractPlay } from '@/lib/support/plays';
import { slack, playBlocks, summaryBlocks, SUPPORT_CHANNEL } from '@/lib/support/slack';

export const maxDuration = 120;
const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const { email, ask, caseId, threadTs } = await request.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const raw = await investigate({ email, ask });
    const play = extractPlay(raw);

    // Attach the customer's actual inbound message so it shows on the play card.
    const [msg] = await sql`SELECT id, subject, body, received_at, case_id FROM support_emails WHERE lower(from_email)=${email.toLowerCase()} ORDER BY received_at DESC LIMIT 1`;
    if (msg) play.customer_message = { subject: msg.subject, body: msg.body, date: msg.received_at ? new Date(msg.received_at).toISOString().slice(0, 10) : null };
    else if (ask && !threadTs) play.customer_message = { subject: null, body: ask, date: null };

    // Contextual admin links (customer profile / message / case).
    const [u] = await sql`SELECT id FROM "user" WHERE lower(email)=${email.toLowerCase()} LIMIT 1`;
    play.admin = {
      base: process.env.SUPPORT_PUBLIC_URL || 'https://app.gymnasticbodies.com',
      userId: u?.id || null,
      messageId: msg?.id || null,
      caseId: caseId || msg?.case_id || null,
    };

    const [f] = await sql`
      INSERT INTO support_fires (case_id, member_email, channel, status, response, actions)
      VALUES (${caseId || null}, ${email.toLowerCase()}, ${SUPPORT_CHANNEL}, 'posted', ${play.response}, ${JSON.stringify(play.actions)})
      RETURNING id, case_id, run_id, member_email, response`;

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
