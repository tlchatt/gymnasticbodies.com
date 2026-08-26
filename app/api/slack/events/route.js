// POST /api/slack/events  — Slack Events API (JSON body, signed with the signing secret).
// This is how a human "replies to the play": a message posted in a play's Slack thread reaches
// the agent here, which re-investigates with that note as guidance and posts an UPDATED play back
// into the same thread. No buttons for revision — the conversation IS the revision channel.
// Read-only + Slack posts only; it never touches accounts (that's /api/support/fire, behind Accept).
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verifySlackSignature, SUPPORT_CHANNEL } from '@/lib/support/slack';

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

    // Map the thread back to its case/member (latest fire on this thread).
    const [f] = await sql`SELECT member_email, case_id FROM support_fires WHERE thread_ts=${e.thread_ts} ORDER BY id DESC LIMIT 1`;
    if (!f) return ack();

    // Fire-and-forget the re-investigation so we ack Slack immediately; it posts the updated play
    // back into THIS thread (threadTs) via /api/support/case.
    fetch(`${baseUrl(request)}/api/support/case`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: f.member_email,
        caseId: f.case_id,
        threadTs: e.thread_ts,
        ask: `A GymnasticBodies support reviewer is refining the suggested reply for this member. Their note/question: "${note}". Address it and return an updated play (revise the draft reply and/or answer the question in your findings).`,
      }),
    }).catch(() => {});

    return ack();
  } catch (err) {
    console.error('[slack events]', err.message);
    return ack();
  }
}
