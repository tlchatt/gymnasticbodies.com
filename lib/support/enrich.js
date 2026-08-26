// Shared play enrichment: attach the customer's latest inbound message and the contextual admin
// links (customer profile / message / case) to a play, so both the initial card (/api/support/case)
// and the in-place edited card (/api/support/refine) render identically. Read-only.
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function enrichPlay(play, email, { caseId } = {}) {
  const e = String(email || '').toLowerCase();
  const [msg] = await sql`SELECT id, subject, body, received_at, case_id FROM support_emails WHERE lower(from_email)=${e} ORDER BY received_at DESC LIMIT 1`;
  if (msg) play.customer_message = { subject: msg.subject, body: msg.body, date: msg.received_at ? new Date(msg.received_at).toISOString().slice(0, 10) : null };
  const [u] = await sql`SELECT id FROM "user" WHERE lower(email)=${e} LIMIT 1`;
  play.admin = {
    base: process.env.SUPPORT_PUBLIC_URL || 'https://app.gymnasticbodies.com',
    userId: u?.id || null,
    messageId: msg?.id || null,
    caseId: caseId || msg?.case_id || null,
  };
  return play;
}
