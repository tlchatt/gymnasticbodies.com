// POST /api/support/investigate  { email, ask? }  ->  { play }
// Runs the read-only investigation agent (Claude via the AI SDK) and returns the play JSON.
// In the full flow this is called from the Gmail-push handler, which then posts the play to
// Slack with the Accept/Edit/Regenerate/Reject buttons. Standalone here so we can verify the
// agent works the moment ANTHROPIC_API_KEY is set (locally or on Vercel).
import { NextResponse } from 'next/server';
import { investigate } from '@/lib/support/investigate';
import { extractPlay } from '@/lib/support/plays';

export const maxDuration = 120; // tool loop + model can take a while

export async function POST(request) {
  try {
    const { email, ask } = await request.json();
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    // No provider-key precheck — the model is swappable (gateway/google/anthropic) and the
    // gateway authenticates via AI_GATEWAY_API_KEY locally or OIDC on Vercel. Let any auth/
    // credit error surface from the model call with its real message.

    const raw = await investigate({ email, ask });
    const play = extractPlay(raw);
    return NextResponse.json({ ok: true, raw, play });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
