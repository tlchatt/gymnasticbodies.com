// Read-only investigation tools — the agent's evidence-gathering layer, ported from the local
// supportAgent CLI (run.js). Neon + live Stripe READS only; no mutation. Each function returns a
// plain object; the investigate route wraps these as AI-SDK tools (adds the zod input schemas).
import { neon } from '@neondatabase/serverless';
import { stripe as stripeClient, resolveStripeCustomers, LIVE_SUB_STATUSES } from '@/lib/stripeServerFunction';

let _sql = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));
const stripe = () => stripeClient;
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

// Every Stripe customer the member has — found through Neon's stored stripe_customer_id AND a
// case-insensitive email search (resolveStripeCustomers). A bare customers.list({ email }) is
// case-sensitive and misses customers whose email changed in Neon only; it told the agent "no
// Stripe customer" for paying members, and the agent wrote "you have not been billed".
export async function memberBilling({ email }) {
  const e = email.toLowerCase();
  const sql = db();
  const u = await sql`SELECT id, email, migration_type, customer_segment FROM "user" WHERE lower(email)=${e} LIMIT 1`;
  let neonSub = null;
  if (u.length) {
    const s = await sql`SELECT data, stripe_customer_id, stripe_subscription_id FROM user_setting WHERE user_id=${u[0].id} AND type='subscription' LIMIT 1`;
    const d = parse(s[0]?.data);
    if (d || s[0]) neonSub = { status: d?.status, price: d?.price, term: d?.term, productName: d?.productName, renewaldate: d?.renewaldate, stripeCustomerId: s[0]?.stripe_customer_id || null, stripeSubscriptionId: s[0]?.stripe_subscription_id || d?.stripeSubscriptionId || null };
  }
  const customers = await resolveStripeCustomers(e, { userId: u[0]?.id });
  const stripeData = [];
  for (const c of customers) {
    const subs = await stripe().subscriptions.list({ customer: c.id, status: 'all', limit: 10 });
    const charges = await stripe().charges.list({ customer: c.id, limit: 10 });
    stripeData.push({
      customer: c.id, stripeEmail: c.email, foundVia: c.sources, created: dt(c.customer?.created),
      subscriptions: subs.data.map((s) => ({ id: s.id, status: s.status, amount: (s.items.data[0]?.price?.unit_amount || 0) / 100, interval: s.items.data[0]?.price?.recurring?.interval, cancel_at_period_end: s.cancel_at_period_end, current_period_end: dt(s.items.data[0]?.current_period_end ?? s.current_period_end), trial_end: dt(s.trial_end) })),
      charges: charges.data.map((x) => ({ id: x.id, amount: x.amount / 100, status: x.status, date: dt(x.created), refunded: x.refunded, amount_refunded: x.amount_refunded / 100, disputed: x.disputed })),
    });
  }
  const liveSubs = stripeData.flatMap((c) => c.subscriptions.filter((s) => LIVE_SUB_STATUSES.includes(s.status)).map((s) => s.id));
  const paidCharges = stripeData.flatMap((c) => c.charges.filter((x) => x.status === 'succeeded')).length;
  const neonSaysCurrent = u[0]?.migration_type === 'current';
  const disagreements = [];
  if (liveSubs.length && !neonSaysCurrent) disagreements.push(`Stripe has live subscription(s) ${liveSubs.join(', ')} but Neon classifies the member as ${u[0]?.migration_type || 'no account'}/${u[0]?.customer_segment || '-'}`);
  if (!liveSubs.length && neonSaysCurrent && u[0]?.customer_segment === 'stripe') disagreements.push('Neon says current/stripe but no live Stripe subscription was found');
  if (neonSub?.stripeCustomerId && !customers.some((c) => c.id === neonSub.stripeCustomerId)) disagreements.push(`Neon stores Stripe customer ${neonSub.stripeCustomerId}, which Stripe could not return`);
  for (const c of stripeData) if (c.stripeEmail && u[0]?.email && c.stripeEmail.toLowerCase() !== u[0].email.toLowerCase()) disagreements.push(`Stripe customer ${c.customer} has email ${c.stripeEmail}; Neon email is ${u[0].email} (email changed on one side only)`);
  return {
    neon: u[0] ? { email: u[0].email, migration_type: u[0].migration_type, customer_segment: u[0].customer_segment } : 'no Neon account',
    neonSub,
    stripe: stripeData.length ? stripeData : 'no Stripe customer found by stored customer id or by email (case-insensitive)',
    summary: { stripeCustomers: stripeData.length, liveSubscriptions: liveSubs, succeededCharges: paidCharges },
    disagreements,
  };
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

// The member's RECENT ACTIVITY STORY from app_logs — what they actually did lately: login
// attempts (success/fail), password resets, renew-page views, payment setup, in-app messages.
// This is how the agent learns the situation has MOVED since they wrote in (e.g. they already
// reset their password and logged in), so it doesn't send a stale reply.
export async function recentActivity({ email }) {
  const e = email.toLowerCase();
  const sql = db();
  // app_logs.data is json — cannot use ->> in a parameterized neon query; fetch raw + summarize in JS.
  const rows = await sql`SELECT ts, event, source, data FROM app_logs WHERE lower(email)=${e} ORDER BY ts DESC LIMIT 100`;
  const brief = (event, data) => {
    let d = data; try { if (typeof d === 'string') d = JSON.parse(d); } catch { /* leave */ }
    const inner = d?.data || d || {};
    if (event === 'my.login.failed' || event === 'auth.signin_failed') return `failed: ${inner.reason || inner.message || ''}`.trim();
    if (event === 'my.login.renewal_redirect') return 'logged in → redirected to renew (lapsed)';
    if (event === 'my.login.success') return 'logged in';
    if (event === 'auth.reset_link.sent') return 'password reset link sent';
    if (event === 'renewalStatus.check') return `needsRenewal=${d?.needsRenewal ?? inner.needsRenewal}`;
    if (event === 'payment_method.setup_intent') return 'started adding a payment method';
    if (event === 'renewal.success') return 'RENEWED (paid)';
    if (event === 'support.message_in_app') return `sent an in-app message (case ${inner.caseId ?? '—'})`;
    if (event === 'admin.provision') return `provisioned (${inner.provisioned || 'legacy'})`;
    return '';
  };
  const digest = (data) => { let d = data; try { if (typeof d === 'string') d = JSON.parse(d); } catch { /* leave */ } if (!d || typeof d !== 'object') return ''; const s = JSON.stringify(d.data || d); return s === '{}' ? '' : s.slice(0, 160); };
  const events = rows.map((r) => ({ ts: r.ts?.toISOString?.().slice(0, 16), event: r.event, source: r.source, note: brief(r.event, r.data) || digest(r.data) }));
  const has = (ev) => rows.find((r) => r.event === ev);
  const count = (ev) => rows.filter((r) => r.event === ev).length;
  const span = (evs) => { const t = events.filter((x) => evs.includes(x.event)).map((x) => x.ts).filter(Boolean).sort(); return t.length ? (t[0] === t[t.length - 1] ? t[0] : `${t[0]}–${t[t.length - 1]}`) : null; };
  const signals = {
    lastActivity: events[0]?.ts || null,
    lastLoginSuccess: (has('my.login.renewal_redirect') || has('my.login.success'))?.ts?.toISOString?.().slice(0, 16) || null,
    lastLoginFailed: has('my.login.failed')?.ts?.toISOString?.().slice(0, 16) || null,
    resetLinksSent: count('auth.reset_link.sent'),
    renewPageViews: count('renew.page_view'),
    startedPayment: !!has('payment_method.setup_intent'),
    renewed: !!has('renewal.success'),
  };
  // A plain-English story of what they did, built deterministically from the log.
  let narrative;
  if (!events.length) {
    narrative = 'No recent activity is logged for this member.';
  } else {
    const parts = [];
    const fails = count('my.login.failed');
    if (fails) parts.push(`${fails} failed login attempt${fails > 1 ? 's' : ''} (${span(['my.login.failed'])})`);
    if (signals.resetLinksSent) parts.push(`requested ${signals.resetLinksSent} password-reset link${signals.resetLinksSent > 1 ? 's' : ''}`);
    if (signals.lastLoginSuccess) parts.push(`logged in successfully at ${signals.lastLoginSuccess}${has('my.login.renewal_redirect') ? ', which redirected them to the renewal paywall (lapsed member)' : ''}`);
    if (signals.renewed) parts.push('completed a renewal (paid)');
    else if (signals.startedPayment) parts.push('started adding a payment method but did not complete it');
    else if (signals.renewPageViews) parts.push(`viewed the renew page ${signals.renewPageViews} time${signals.renewPageViews > 1 ? 's' : ''}`);
    const msgs = count('support.message_in_app');
    if (msgs) parts.push(`sent ${msgs} in-app support message${msgs > 1 ? 's' : ''}`);
    narrative = `Recent activity (last seen ${signals.lastActivity}): ${parts.length ? parts.join('; ') + '.' : 'general activity, nothing notable.'} (Message contents are in supportHistory — this log shows actions, not text.)`;
  }
  return { narrative, signals, events };
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
  memberBilling: 'Neon subscription record PLUS live Stripe — EVERY Stripe customer for the member (found by the stored Stripe customer id and by case-insensitive email), each with subscriptions, recent charges (ids, refunds, disputes), and a `disagreements` list where Neon and Stripe do not match. Verify what they actually pay — never trust the Neon plan label or stripeSubscriptionId alone.',
  priorFollowup: 'What we have already sent this member: outbound campaign emails and support replies. Many cases are already handled and just closeable.',
  supportHistory: "This member's support cases and their inbound messages (their full relationship).",
  workoutState: 'Guided-plan / workout health: total logs, last activity, and the levels_schedule week shape (to spot a wiped or inflated guided plan).',
  searchCaseHistory: 'Search PAST support cases across ALL members for precedent on a similar issue — how we handled the same kind of problem before and the reply we sent. ALWAYS use this before drafting so your response and actions match precedent.',
  recentActivity: "The member's RECENT ACTIVITY from app_logs — the story of what they actually did lately (login attempts and successes/failures, password resets, renew-page views, payment setup, in-app messages). Use it to tell whether the situation has MOVED since they wrote in (e.g. they already reset their password and logged in) so you don't send a stale reply.",
};
