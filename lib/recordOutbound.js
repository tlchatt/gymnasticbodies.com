// Records an automated ADMINISTRATIVE email (account / billing / membership notice) in outbound_emails
// — claudePlans/communication-flows.md, category 3. Not a case: type 'administrative', case_id NULL.
// The FULL body is kept (owner 2026-10-09: "the full record — we can use it to find the password for
// the user"), so login-details and reset emails are recoverable from the admin side.
// Called only AFTER a successful send. Never throws: a record failure is logged, the send stands.
import { neon } from '@neondatabase/serverless';

let _sql = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));

export async function recordAdministrativeEmail({ toEmail, subject, body, campaign, userId = null }) {
  const email = String(toEmail || '').trim().toLowerCase();
  if (!email) return false;
  try {
    let uid = userId;
    if (!uid) { const [u] = await db()`SELECT id FROM "user" WHERE lower(email) = ${email} LIMIT 1`; uid = u?.id || null; }
    await db()`INSERT INTO outbound_emails (user_id, to_email, subject, body, campaign, type, sent_at)
               VALUES (${uid}, ${email}, ${subject || ''}, ${body ?? null}, ${campaign || null}, 'administrative', now())`;
    return true;
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'outbound.record_failed', email, campaign, error: err.message }));
    return false;
  }
}
