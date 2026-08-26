// POST /api/support/refine  { threadTs, note }
// A support reviewer replied in a play's Slack thread. Re-investigate with their note (refine mode),
// EDIT the suggested reply on the existing play card in place (always the top card — never a new one),
// and post a short conversational agent reply into the thread that answers them and says the card was
// updated. Read-only investigation; the only writes are the fire's stored draft + the Slack messages.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { investigate } from '@/lib/support/investigate';
import { extractPlay } from '@/lib/support/plays';
import { enrichPlay } from '@/lib/support/enrich';
import { slack, playBlocks } from '@/lib/support/slack';

export const maxDuration = 120;
const sql = neon(process.env.DATABASE_URL);

export async function POST(request) {
  try {
    const { threadTs, note } = await request.json();
    if (!threadTs || !note) return NextResponse.json({ error: 'threadTs and note required' }, { status: 400 });

    const [f] = await sql`SELECT * FROM support_fires WHERE thread_ts=${threadTs} ORDER BY id DESC LIMIT 1`;
    if (!f) return NextResponse.json({ ok: false, error: 'no fire for this thread' }, { status: 404 });

    const play = extractPlay(await investigate({ email: f.member_email, ask: note, mode: 'refine' }));
    await enrichPlay(play, f.member_email, { caseId: f.case_id });

    // Persist the revised draft on the fire.
    await sql`UPDATE support_fires SET response=${play.response}, actions=${JSON.stringify(play.actions)}, updated_at=now() WHERE id=${f.id}`;

    // Edit the suggested reply IN PLACE on the top card — but only while it's still awaiting a
    // decision (a scheduled/fired card keeps its final state).
    if (f.play_ts && f.status === 'posted') {
      await slack('chat.update', {
        channel: f.channel, ts: f.play_ts, text: `Play for ${f.member_email}`,
        blocks: playBlocks({ ...f, response: play.response }, play),
      });
    }

    // Conversational reply to the reviewer in the thread.
    const convo = (play.reviewer_note || '').trim() || 'Updated the suggestion based on your note.';
    await slack('chat.postMessage', {
      channel: f.channel, thread_ts: threadTs,
      text: `${convo}\n\n_✏️ I updated the suggested reply above._`,
    });

    return NextResponse.json({ ok: true, fireId: f.id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
