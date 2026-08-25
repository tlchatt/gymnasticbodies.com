// Read-only investigation tools — the agent's evidence-gathering layer, ported from the local
// supportAgent CLI (run.js). Neon + live Stripe READS only; no mutation. Each function returns a
// plain object; the investigate route wraps these as AI-SDK tools (adds the zod input schemas).
import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe';

let _sql = null, _stripe = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));
const stripe = () => (_stripe ||= new Stripe(process.env.STRIPE_SECRET_KEY));
const parse = (d) => { let x = d; for (let i = 0; i < 2; i++) if (typeof x === 'string') { try { x = JSON.parse(x); } catch { break; } } return x; };
const dt = (t) => (t ? new Date(t * 1000).toISOString().slice(0, 10) : null);

export async function lookupMember({ email }) {
  const e = email.toLowerCase();
  const sql = db();
  const primary = await sql`SELECT id, name, email, migration_type, customer_segment, created_at FROM "user" WHERE lower(email)=${e} LIMIT 1`;
  let others = [];
  const name = primary[0]?.name || null;
  const localpart = e.split('@')[0].replace(/[^a-z0-9]/g, '');
  if (name || localpart) {
    others = await sql`SELECT id, name, email, migration_type, customer_segment FROM "user"
      WHERE lower(email) <> ${e} AND (
        (${name}::text IS NOT NULL AND lower(name) = lower(${name})) OR
        (length(${localpart}) >= 4 AND lower(regexp_replace(email,'@.*','')) LIKE ${'%' + localpart + '%'})
      ) LIMIT 8`;
  }
  return { primary: primary[0] || null, possibleOtherAccounts: others };
}

export async function memberBilling({ email }) {
  const e = email.toLowerCase();
  const sql = db();
  const u = await sql`SELECT id FROM "user" WHERE lower(email)=${e} LIMIT 1`;
  let neonSub = null;
  if (u.length) {
    const s = await sql`SELECT data FROM user_setting WHERE user_id=${u[0].id} AND type='subscription' LIMIT 1`;
    const d = parse(s[0]?.data);
    if (d) neonSub = { status: d.status, price: d.price, term: d.term, productName: d.productName, renewaldate: d.renewaldate, stripeSubscriptionId: d.stripeSubscriptionId };
  }
  const custs = await stripe().customers.list({ email: e, limit: 5 });
  const stripeData = [];
  for (const c of custs.data) {
    const subs = await stripe().subscriptions.list({ customer: c.id, status: 'all', limit: 10 });
    const charges = await stripe().charges.list({ customer: c.id, limit: 6 });
    stripeData.push({
      customer: c.id, created: dt(c.created),
      subscriptions: subs.data.map((s) => ({ id: s.id, status: s.status, amount: (s.items.data[0]?.price?.unit_amount || 0) / 100, interval: s.items.data[0]?.price?.recurring?.interval, cancel_at_period_end: s.cancel_at_period_end })),
      charges: charges.data.map((x) => ({ amount: x.amount / 100, status: x.status, date: dt(x.created), refunded: x.refunded })),
    });
  }
  return { neonSub, stripe: stripeData.length ? stripeData : 'no Stripe customer for this email' };
}

export async function priorFollowup({ email }) {
  const e = email.toLowerCase();
  const sql = db();
  const outbound = await sql`SELECT campaign, type, sent_at FROM outbound_emails WHERE lower(to_email)=${e} ORDER BY sent_at`;
  const replies = await sql`SELECT left(sr.body,200) body, sr.sent_at FROM support_replies sr JOIN support_emails se ON sr.email_id=se.id WHERE lower(se.from_email)=${e} ORDER BY sr.sent_at`;
  return { outbound, replies };
}

export async function supportHistory({ email }) {
  const e = email.toLowerCase();
  const sql = db();
  const cases = await sql`SELECT id, status, priority, title, created_at FROM support_cases WHERE lower(from_email)=${e} ORDER BY id`;
  const recentMessages = await sql`SELECT id, case_id, left(body,400) body, received_at FROM support_emails WHERE lower(from_email)=${e} ORDER BY received_at DESC LIMIT 5`;
  return { cases, recentMessages };
}

export async function workoutState({ email }) {
  const e = email.toLowerCase();
  const sql = db();
  const u = await sql`SELECT id FROM "user" WHERE lower(email)=${e} LIMIT 1`;
  if (!u.length) return { note: 'no account' };
  const logs = await sql`SELECT count(*)::int n, max(user_schedule_date) last FROM user_logs WHERE user_id=${u[0].id}`;
  const ls = await sql`SELECT data FROM user_setting WHERE user_id=${u[0].id} AND type='levels_schedule' LIMIT 1`;
  const d = parse(ls[0]?.data); const days = d?.days || {};
  const guidedWeekShape = Object.keys(days).sort((a, b) => a - b).map((k) => (days[k] || []).length);
  return { totalLogs: logs[0].n, lastActivity: logs[0].last, guidedWeekShape, seeded: d?.seeded };
}

export async function searchCaseHistory({ query }) {
  const sql = db();
  const q = `%${String(query).toLowerCase().trim().replace(/\s+/g, '%')}%`;
  const cases = await sql`
    SELECT DISTINCT c.id, c.title, c.status, c.from_email
    FROM support_cases c LEFT JOIN support_emails e ON e.case_id = c.id
    WHERE lower(c.title) LIKE ${q} OR lower(e.body) LIKE ${q}
    ORDER BY c.id DESC LIMIT 8`;
  const matches = [];
  for (const c of cases) {
    const replies = await sql`SELECT left(sr.body,300) body, sr.sent_at FROM support_replies sr JOIN support_emails se ON sr.email_id=se.id WHERE se.case_id=${c.id} ORDER BY sr.sent_at LIMIT 3`;
    const notes = await sql`SELECT left(admin_notes,300) notes FROM support_cases WHERE id=${c.id} AND admin_notes IS NOT NULL`;
    matches.push({ caseId: c.id, title: c.title, status: c.status, repliesSent: replies, adminNotes: notes[0]?.notes || null });
  }
  return { query, matches };
}

// Descriptions for the AI-SDK tool wrappers (the route pairs these with zod schemas).
export const TOOL_DESCRIPTIONS = {
  lookupMember: 'Find the member by email, and search by name/local-part for other accounts they may have under a different email (split/duplicate accounts are common). Returns every matching account with payment status.',
  memberBilling: 'Neon subscription record PLUS live Stripe (customers, subscriptions with amounts, recent charges). Verify what they actually pay — never trust the Neon plan label or stripeSubscriptionId alone.',
  priorFollowup: 'What we have already sent this member: outbound campaign emails and support replies. Many cases are already handled and just closeable.',
  supportHistory: "This member's support cases and their inbound messages (their full relationship).",
  workoutState: 'Guided-plan / workout health: total logs, last activity, and the levels_schedule week shape (to spot a wiped or inflated guided plan).',
  searchCaseHistory: 'Search PAST support cases across ALL members for precedent on a similar issue — how we handled the same kind of problem before and the reply we sent. ALWAYS use this before drafting so your response and actions match precedent.',
};
