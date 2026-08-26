// POST /api/slack/events  — Slack Events API (JSON body, signed with the signing secret).
// This is how a human "replies to the play": a message posted in a play's Slack thread reaches
// the agent here, which re-investigates with that note as guidance and posts an UPDATED play back
// into the same thread. No buttons for revision — the conversation IS the revision channel.
// Read-only + Slack posts only; it never touches accounts (that's /api/support/fire, behind Accept).
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifySlackSignature, slack, SUPPORT_CHANNEL } from '@/lib/support/slack';

const sql = neon(process.env.DATABASE_URL);
const ack = () => new NextResponse('', { status: 200 });
const baseUrl = (request) => process.env.SUPPORT_PUBLIC_URL || new URL(request.url).origin;

export async function POST(request) {
  const raw = await request.text();
  let body;
  try { body = JSON.parse(raw); } catch { return ack(); }

  // Slack's one-time Request URL handshake — echo the challenge (still signed, so verify first).
  if (body.type === 'url_verification') {
    if (!verifySlackSignature(raw, request.headers)) return new NextResponse('bad signature', { status: 401 });
    return NextResponse.json({ challenge: body.challenge });
  }

  if (!verifySlackSignature(raw, request.headers)) return new NextResponse('bad signature', { status: 401 });
  // We ack fast (Slack retries on non-200 within 3s). If this IS a retry, don't reprocess.
  if (request.headers.get('x-slack-retry-num')) return ack();

  try {
    const e = body.event;
    if (
      body.type !== 'event_callback' || !e || e.type !== 'message' ||
      e.bot_id || e.subtype ||                       // bot posts / edits / joins — ignore
      e.channel !== SUPPORT_CHANNEL ||               // only the support channel
      !e.thread_ts || e.thread_ts === e.ts           // must be a reply INSIDE a thread
    ) return ack();

    const note = String(e.text || '').replace(/<@[^>]+>/g, '').trim(); // strip @mentions
    if (!note) return ack();

    // Only respond if this thread actually has a play (a fire).
    const [f] = await sql`SELECT id FROM support_fires WHERE thread_ts=${e.thread_ts} ORDER BY id DESC LIMIT 1`;
    if (!f) return ack();

    // Instant acknowledgement so the reviewer gets immediate feedback (the refine run takes ~30s).
    await slack('chat.postMessage', {
      channel: e.channel, thread_ts: e.thread_ts,
      text: '🔍 On it — investigating your note, I’ll follow up shortly…',
    });

    // Fire-and-forget the refine so we ack Slack within its 3s window. It edits the suggested reply
    // on the top card in place and posts a conversational reply into THIS thread.
    fetch(`${baseUrl(request)}/api/support/refine`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadTs: e.thread_ts, note }),
    }).catch(() => {});

    return ack();
  } catch (err) {
    console.error('[slack events]', err.message);
    return ack();
  }
}
