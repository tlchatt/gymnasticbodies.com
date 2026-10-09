// The ONE case picker for support communication (claudePlans/communication-flows.md, "Case rules").
// Owner's core rule: a message from a customer IS a case; our reply is a communication on that case.
// Every inbound path (Gmail sync, in-app message) and every outbound support send calls this module —
// never its own copy of the rules.
//
//   Member sends a REPLY to one of our support emails (or on a case in the app):
//     that case is open                     -> add it there
//     closed/resolved < 60 days ago         -> reopen that case
//     closed/resolved >= 60 days ago        -> new case, admin_notes "Continues case #N"
//   Member sends a FRESH message:
//     they have an OPEN case                -> add it there (one open case per member)
//     otherwise                             -> new case, linked back to their last case (if any)
//
// "Is it a reply, and to which case?" — every support email we send carries our case id in its
// Message-ID (<case-123.abc@gymnasticbodies.com>); a member's reply quotes it in In-Reply-To /
// References. Fallback: the case of an earlier message in the same Gmail thread. A header/thread
// match is only trusted when that case belongs to the same sender (no attaching to someone else's case).
// Email matching is case-insensitive everywhere.
//
// Plain neon SQL (no Drizzle, no Next imports) so the CLI tools can load it through jiti too.
import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';

let _sql = null;
const defaultSql = () => (_sql ||= neon(process.env.DATABASE_URL));

export const OPEN_CASE_STATUSES = ['open', 'pending', 'reopened', 'escalated'];
export const CLOSED_CASE_STATUSES = ['resolved', 'closed'];
export const REOPEN_WINDOW_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const MSGID_DOMAIN = 'gymnasticbodies.com';

const norm = (e) => String(e || '').trim().toLowerCase();

// Message-ID for a support email on a case: <case-123.9f2c4e1a7b3d@gymnasticbodies.com>
export function caseMessageId(caseId) {
  const id = Number(caseId);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`caseMessageId: invalid case id ${caseId}`);
  return `<case-${id}.${randomBytes(8).toString('hex')}@${MSGID_DOMAIN}>`;
}

// Case ids found in In-Reply-To / References (most recent reference first).
export function caseIdsFromHeaders({ inReplyTo, references } = {}) {
  const re = new RegExp(`<case-(\\d+)\\.[0-9a-z]+@${MSGID_DOMAIN.replace(/\./g, '\\.')}>`, 'gi');
  const grab = (s) => [...String(s || '').matchAll(re)].map((m) => Number(m[1]));
  // In-Reply-To is the direct parent; References lists oldest -> newest, so prefer the end.
  return [...new Set([...grab(inReplyTo), ...grab(references).reverse()])];
}

// When was this case closed? resolved_at, falling back to updated_at for rows closed without it.
function closedAt(c) {
  const t = c.resolved_at || c.updated_at;
  return t ? new Date(t) : null;
}

function belongsTo(c, { email, userId }) {
  if (!c) return false;
  if (userId && c.user_id && c.user_id === userId) return true;
  return !!email && norm(c.from_email) === norm(email);
}

async function getCase(sql, id) {
  const [c] = await sql`SELECT id, user_id, from_email, status, resolved_at, updated_at, created_at FROM support_cases WHERE id = ${id}`;
  return c || null;
}

// The member's most recent OPEN case (open/pending/reopened/escalated), by email (any case) or user id.
export async function findOpenCase({ email, userId, sql = defaultSql() } = {}) {
  const e = norm(email);
  if (!e && !userId) return null;
  const [c] = await sql`
    SELECT id, user_id, from_email, status FROM support_cases
    WHERE status = ANY(${OPEN_CASE_STATUSES})
      AND ((${e} <> '' AND lower(from_email) = ${e}) OR (${userId || ''} <> '' AND user_id = ${userId || ''}))
    ORDER BY created_at DESC LIMIT 1`;
  return c || null;
}

// The member's most recent case of any status.
export async function findLastCase({ email, userId, sql = defaultSql() } = {}) {
  const e = norm(email);
  if (!e && !userId) return null;
  const [c] = await sql`
    SELECT id, status FROM support_cases
    WHERE (${e} <> '' AND lower(from_email) = ${e}) OR (${userId || ''} <> '' AND user_id = ${userId || ''})
    ORDER BY created_at DESC LIMIT 1`;
  return c || null;
}

async function createCase(sql, { email, userId, name, title, linkTo, status = 'open', priority = 'normal', note }) {
  const notes = [linkTo ? `Continues case #${linkTo}` : null, note || null].filter(Boolean).join('\n') || null;
  const [c] = await sql`
    INSERT INTO support_cases (user_id, from_email, from_name, title, status, priority, admin_notes)
    VALUES (${userId || null}, ${norm(email)}, ${name || null}, ${String(title || '(no subject)').slice(0, 300)}, ${status}, ${priority}, ${notes})
    RETURNING id`;
  return c.id;
}

// Apply the reply rule to a specific earlier case.
async function replyOnto(sql, prior, member) {
  if (OPEN_CASE_STATUSES.includes(prior.status)) return { caseId: prior.id, action: 'attached', reply: true };
  const at = closedAt(prior);
  if (at && Date.now() - at.getTime() < REOPEN_WINDOW_DAYS * DAY_MS) {
    await sql`UPDATE support_cases SET status = 'open', resolved_at = NULL, updated_at = now() WHERE id = ${prior.id}`;
    return { caseId: prior.id, action: 'reopened', reply: true };
  }
  const caseId = await createCase(sql, { ...member, linkTo: prior.id });
  return { caseId, action: 'created', reply: true, linkedFrom: prior.id };
}

// Which case does an INBOUND member message belong to? Creates/reopens as the rules say.
//   { email, userId, name, subject, inReplyTo, references, threadId, replyToCaseId }
// replyToCaseId: the caller already knows it is a reply on that case (in-app reply on a case,
// ownership already checked by the caller). Returns { caseId, action, reply, linkedFrom?, via }.
export async function caseForInbound({ email, userId = null, name = null, subject = null, inReplyTo = null, references = null, threadId = null, replyToCaseId = null, sql = defaultSql() } = {}) {
  const member = { email, userId, name, title: subject };

  // 1. Explicit case (in-app reply on a case).
  if (replyToCaseId) {
    const prior = await getCase(sql, replyToCaseId);
    if (prior) return { ...(await replyOnto(sql, prior, member)), via: 'explicit' };
  }
  // 2. Our case id stamped in the Message-ID the member is replying to.
  for (const id of caseIdsFromHeaders({ inReplyTo, references })) {
    const prior = await getCase(sql, id);
    if (belongsTo(prior, { email, userId })) return { ...(await replyOnto(sql, prior, member)), via: 'header' };
  }
  // 3. An earlier message in the same Gmail thread.
  if (threadId) {
    const [t] = await sql`
      SELECT c.id, c.user_id, c.from_email, c.status, c.resolved_at, c.updated_at
      FROM support_emails e JOIN support_cases c ON c.id = e.case_id
      WHERE e.gmail_thread_id = ${threadId}
      ORDER BY e.received_at DESC LIMIT 1`;
    if (belongsTo(t, { email, userId })) return { ...(await replyOnto(sql, t, member)), via: 'thread' };
  }
  // 4. Fresh message: the member's open case, else a new case linked back to their last one.
  const open = await findOpenCase({ email, userId, sql });
  if (open) return { caseId: open.id, action: 'attached', reply: false, via: 'open_case' };
  const last = await findLastCase({ email, userId, sql });
  const caseId = await createCase(sql, { ...member, linkTo: last?.id });
  return { caseId, action: 'created', reply: false, via: 'new', ...(last ? { linkedFrom: last.id } : {}) };
}

// The case an OUTBOUND support email (one we start) goes on: the member's open case, else a new
// case linked back to their last one. Every support communication is tied to a case.
export async function caseForOutbound({ email, userId = null, name = null, title = null, sql = defaultSql() } = {}) {
  const open = await findOpenCase({ email, userId, sql });
  if (open) return { caseId: open.id, action: 'attached' };
  const last = await findLastCase({ email, userId, sql });
  const caseId = await createCase(sql, { email, userId, name, title: title || 'Support email', linkTo: last?.id });
  return { caseId, action: 'created', ...(last ? { linkedFrom: last.id } : {}) };
}
