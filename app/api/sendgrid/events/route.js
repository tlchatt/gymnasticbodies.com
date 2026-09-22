import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { neon } from '@neondatabase/serverless';
import { logger } from '@/lib/logger';

// SendGrid Event Webhook receiver.
// SendGrid POSTs a JSON array of delivery events here. On a hard bounce, a drop,
// or a spam complaint we flag the user's `email_status` so every sender skips
// that address, and record a human-readable `email.bounced` note in app_logs.
// Transient "blocked" events are ignored (greylisting / temporary deferrals).
//
// The request is verified against SendGrid's Signed Event Webhook public key
// (ECDSA P-256 over `timestamp + rawBody`). Without a valid signature the request
// is rejected — this endpoint is public, and an unverified POST could otherwise
// suppress arbitrary accounts.

export const dynamic = 'force-dynamic';

const SIG_HEADER = 'x-twilio-email-event-webhook-signature';
const TS_HEADER = 'x-twilio-email-event-webhook-timestamp';

function verifySignature(publicKeyB64, rawBody, signature, timestamp) {
  try {
    const pem = `-----BEGIN PUBLIC KEY-----\n${publicKeyB64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----\n`;
    const verifier = crypto.createVerify('sha256');
    verifier.update(timestamp + rawBody);
    verifier.end();
    return verifier.verify(pem, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

// Map a SendGrid event to a suppressing status, or null to ignore it.
function statusForEvent(ev) {
  if (ev.event === 'spamreport') return 'spam_report';
  if (ev.event === 'bounce') return ev.type === 'blocked' ? null : 'bounced'; // hard bounce only
  if (ev.event === 'dropped') {
    const r = String(ev.reason || '').toLowerCase();
    if (r.includes('spam')) return 'spam_report';
    if (r.includes('invalid')) return 'invalid';
    return 'bounced';
  }
  return null; // delivered/open/click/blocked/deferred/processed → ignore
}

// Higher number = more severe; never downgrade an existing flag.
const RANK = { bounced: 1, invalid: 2, spam_report: 3 };

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get(SIG_HEADER);
  const timestamp = request.headers.get(TS_HEADER);
  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;

  if (!publicKey) {
    logger.error('sendgrid.webhook.no_key', {});
    return NextResponse.json({ error: 'not configured' }, { status: 503 });
  }
  if (!signature || !timestamp || !verifySignature(publicKey, rawBody, signature, timestamp)) {
    logger.warn('sendgrid.webhook.bad_signature', {});
    return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  let events;
  try {
    events = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }
  if (!Array.isArray(events)) events = [events];

  const sql = neon(process.env.DATABASE_URL);
  let flagged = 0;

  for (const ev of events) {
    const status = statusForEvent(ev);
    if (!status) continue;
    const email = String(ev.email || '').trim().toLowerCase();
    if (!email) continue;

    const [u] = await sql`SELECT id, email_status FROM "user" WHERE lower(email) = ${email} LIMIT 1`;
    if (!u) continue;
    // Don't downgrade a more severe existing flag.
    if (u.email_status && (RANK[status] || 0) <= (RANK[u.email_status] || 0)) continue;

    const at = ev.timestamp ? new Date(ev.timestamp * 1000) : new Date();
    await sql`UPDATE "user" SET email_status = ${status}, email_status_at = ${at.toISOString()} WHERE id = ${u.id}`;
    await sql`INSERT INTO app_logs (ts, level, event, email, user_id, source, data)
      VALUES (now(), ${'warn'}, ${'email.bounced'}, ${email}, ${u.id}, ${'sendgrid_webhook'},
        ${JSON.stringify({ status, sgEvent: ev.event, reason: ev.reason || '', note: `Email ${status} per SendGrid — future sends suppressed. ${ev.reason || ''}`.trim() })})`;
    flagged++;
  }

  return NextResponse.json({ ok: true, received: events.length, flagged });
}
