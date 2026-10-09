// The ONE way a support email leaves us (claudePlans/communication-flows.md, S4–S7).
// Every support send is on a case, carries the case id in its Message-ID (so the member's reply finds
// the case again — lib/support/caseFor.js), and is ALWAYS recorded:
//   - a reply to a specific inbound message by a person  -> support_replies (on that message)
//   - anything else (agent reply, escalation notice, proactive email, no inbound message)
//                                                         -> outbound_emails, type 'support', case_id
// The email is sent first; a failure to record it afterwards is reported, never thrown (throwing
// would misreport a real send and invite a duplicate on retry).
//
// Plain neon SQL (no Next imports) so the CLI tools can load it through jiti too.
import { neon } from '@neondatabase/serverless';
import sgMail from '@sendgrid/mail';
import { caseMessageId } from './caseFor.js';

let _sql = null;
const defaultSql = () => (_sql ||= neon(process.env.DATABASE_URL));

export const SUPPORT_FROM = 'support@gymnasticbodies.com';

export function replySubject(subject) {
  const s = String(subject || '').trim();
  if (!s) return 'Regarding your GymnasticBodies account';
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

// { to, subject, text, caseId, emailId?, adminUserId?, userId?, campaign?, from?, sql? }
// Returns { messageId, recordedIn: 'support_replies'|'outbound_emails', recordId, recorded: true|string }
export async function sendCaseEmail({ to, subject, text, caseId, emailId = null, adminUserId = null, userId = null, campaign = null, from = SUPPORT_FROM, sql = defaultSql() }) {
  const id = Number(caseId);
  if (!Number.isInteger(id) || id <= 0) throw new Error('support email refused: no case — every support communication must be on a case');
  const toEmail = String(to || '').trim().toLowerCase();
  if (!toEmail.includes('@')) throw new Error('support email refused: no recipient');
  const body = String(text || '').trim();
  if (!body) throw new Error('support email refused: empty body');
  if (!process.env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not set');

  const messageId = caseMessageId(id);
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  await sgMail.send({
    to: toEmail, from, replyTo: SUPPORT_FROM, subject, text: body,
    headers: { 'Message-ID': messageId, 'X-GB-Case': String(id) },
  });

  try {
    if (emailId && adminUserId) {
      const [r] = await sql`INSERT INTO support_replies (email_id, admin_user_id, body, gmail_message_id)
                            VALUES (${emailId}, ${adminUserId}, ${body}, ${messageId}) RETURNING id, email_id, body, sent_at`;
      await sql`UPDATE support_emails SET status = 'replied', replied_at = now(), updated_at = now() WHERE id = ${emailId}`;
      return { messageId, recordedIn: 'support_replies', recordId: r.id, reply: { id: r.id, emailId: r.email_id, body: r.body, sentAt: r.sent_at }, recorded: true };
    }
    let uid = userId;
    if (!uid) { const [u] = await sql`SELECT id FROM "user" WHERE lower(email) = ${toEmail} LIMIT 1`; uid = u?.id || null; }
    const [o] = await sql`INSERT INTO outbound_emails (user_id, to_email, subject, body, campaign, type, case_id, sent_at)
                          VALUES (${uid}, ${toEmail}, ${subject}, ${body}, ${campaign}, 'support', ${id}, now()) RETURNING id`;
    if (emailId) await sql`UPDATE support_emails SET status = 'replied', replied_at = now(), updated_at = now() WHERE id = ${emailId}`;
    return { messageId, recordedIn: 'outbound_emails', recordId: o.id, recorded: true };
  } catch (e) {
    return { messageId, recordedIn: null, recordId: null, recorded: `sent, but not recorded: ${e.message}` };
  }
}
