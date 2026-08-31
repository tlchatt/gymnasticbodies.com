// /api/gmail/watch — arms (and daily re-arms) the Gmail push "watch" on the support mailbox.
// Gmail watches expire after 7 days, so a daily cron calls this. Uses the same Gmail OAuth
// credentials as the sync. Requires GMAIL_PUBSUB_TOPIC = projects/<gb-project>/topics/<name>.
// Auth: Vercel cron sends `Authorization: Bearer <CRON_SECRET>`; manual callers use `x-cron-secret`.
import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export const maxDuration = 60;

function isCronRequest(req) {
  const s = process.env.CRON_SECRET;
  if (!s) return false;
  if (req.headers.get('x-cron-secret') === s) return true;
  return req.headers.get('authorization') === `Bearer ${s}`;
}

function gmailClient() {
  const o = new google.auth.OAuth2(process.env.GMAIL_CLIENT_ID, process.env.GMAIL_CLIENT_SECRET);
  o.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: o });
}

async function handle(request) {
  if (!isCronRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.GMAIL_PUBSUB_TOPIC) return NextResponse.json({ ok: false, error: 'GMAIL_PUBSUB_TOPIC not set' }, { status: 400 });
  try {
    const gmail = gmailClient();
    const prof = await gmail.users.getProfile({ userId: 'me' });
    const res = await gmail.users.watch({ userId: 'me', requestBody: { topicName: process.env.GMAIL_PUBSUB_TOPIC, labelIds: ['INBOX'], labelFilterBehavior: 'INCLUDE' } });
    return NextResponse.json({ ok: true, mailbox: prof.data.emailAddress, historyId: res.data.historyId, expiration: res.data.expiration });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
