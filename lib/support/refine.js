// Shared refine logic — a support reviewer replied in a play's Slack thread. Re-investigate with
// their note (refine mode), EDIT the suggested reply on the existing play card in place (always the
// top card — never a new one), and post a short conversational agent reply into the thread that
// answers them. Read-only investigation; the only writes are the fire's stored draft + Slack posts.
//
// Called two ways, both of which must keep the work alive to completion (never fire-and-forget):
//   - /api/support/refine (awaited)
//   - /api/slack/events via `after()` (Vercel keeps the function alive for it)
import { neon } from '@neondatabase/serverless';
import { investigate } from '@/lib/support/investigate';
import { extractPlay } from '@/lib/support/plays';
import { enrichPlay } from '@/lib/support/enrich';
import { slack, playBlocks } from '@/lib/support/slack';

const sql = neon(process.env.DATABASE_URL);

export async function runRefine({ threadTs, note }) {
  const [f] = await sql`SELECT * FROM support_fires WHERE thread_ts=${threadTs} ORDER BY id DESC LIMIT 1`;
  if (!f) return { ok: false, error: 'no fire for this thread' };

  const play = extractPlay(await investigate({ email: f.member_email, ask: note, mode: 'refine' }));
  await enrichPlay(play, f.member_email, { caseId: f.case_id });

  // Persist the revised draft + full play on the fire.
  await sql`UPDATE support_fires SET response=${play.response}, actions=${JSON.stringify(play.actions)}, play=${JSON.stringify(play)}, updated_at=now() WHERE id=${f.id}`;

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

  return { ok: true, fireId: f.id };
}
