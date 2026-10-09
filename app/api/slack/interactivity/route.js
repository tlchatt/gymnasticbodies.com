// POST /api/slack/interactivity  — Slack sends button clicks here (form-encoded `payload=<json>`),
// signed with the signing secret. This is the "gate" surface: Accept arms the 5-minute fuse, Undo
// cancels it. There is no Reject/Edit/Regenerate button anymore — to revise or ask the agent
// anything, a human just replies in the Slack thread (handled by /api/slack/events).
// This route never executes account changes — that's /api/support/fire (the deterministic back layer).
// The decision logic is shared with the admin card: acceptFire / undoFire in lib/support/fire.js.
import { NextResponse } from 'next/server';
import { verifySlackSignature } from '@/lib/support/slack';
import { acceptFire, undoFire } from '@/lib/support/fire';

const ack = () => new NextResponse('', { status: 200 });

export async function POST(request) {
  const raw = await request.text();
  if (!verifySlackSignature(raw, request.headers)) return new NextResponse('bad signature', { status: 401 });
  const payload = JSON.parse(new URLSearchParams(raw).get('payload'));

  try {
    const action = payload.actions?.[0];
    if (!action) return ack();
    if (action.action_id === 'accept') await acceptFire(Number(action.value));
    else if (action.action_id === 'undo') await undoFire(Number(action.value));
    return ack();
  } catch (e) {
    console.error('[interactivity]', e.message);
    return ack(); // always 200 so Slack doesn't show an error to the user
  }
}
