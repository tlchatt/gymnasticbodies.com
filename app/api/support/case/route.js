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
    const { email, ask, caseId } = await request.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const raw = await investigate({ email, ask });
    const play = extractPlay(raw);

    const [f] = await sql`
      INSERT INTO support_fires (case_id, member_email, channel, status, response, actions)
      VALUES (${caseId || null}, ${email.toLowerCase()}, ${SUPPORT_CHANNEL}, 'posted', ${play.response}, ${JSON.stringify(play.actions)})
      RETURNING id, case_id, run_id, member_email, response`;

    // Compact parent in the channel …
    const parent = await slack('chat.postMessage', {
      channel: SUPPORT_CHANNEL, text: `Support case · ${email}`, blocks: summaryBlocks(f, play),
    });
    if (!parent.ok) throw new Error(`slack post failed: ${parent.error}`);
    // … full play + buttons in its thread.
    const detail = await slack('chat.postMessage', {
      channel: SUPPORT_CHANNEL, thread_ts: parent.ts, text: `Play for ${email}`, blocks: playBlocks(f, play),
    });
    // thread_ts = parent (fire results post here); play_ts = detail (buttons update here).
    await sql`UPDATE support_fires SET thread_ts=${parent.ts}, play_ts=${detail.ts}, updated_at=now() WHERE id=${f.id}`;

    return NextResponse.json({ ok: true, fireId: f.id, ts: parent.ts, play });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
