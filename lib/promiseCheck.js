// Daily promise check (2026-10-09). Things we tell members — "refunded", "cancelled", "credited",
// "deleted", "banned" — are recorded in app_logs when the action runs, and until now nothing ever
// looked again. Kyle Consolie's refund went from succeeded to failed 15 hours later and nobody knew.
//
// This reads every promise event from app_logs over the last N days (default 14), checks each one
// against live Stripe + Neon, and returns the mismatches. Not a dry run: each mismatch is posted as
// ONE alert (lib/alerts.js), at most once per source event — the claim row is
// `promise_check.flagged` with data.key = the source event (`app_logs:<id>` / `support_fires:<id>:<refund>`).
//
// Checks:
//   admin.refund (+ refunds in support_fires results not already logged)
//       refund status succeeded and the charge shows it refunded; failed/canceled = mismatch;
//       pending/requires_action older than 3 days = mismatch.
//   admin.cancel_subscription   Stripe sub canceled or set to cancel; Neon row cancelled/pending_cancel.
//   admin.billing_credit / admin.grant_access
//       Stripe trial_end or Neon renewaldate reaches the promised "to" date.
//   admin.account_deleted       Neon user row gone; no live Stripe subscription remains.
//   admin.member_banned         every account banned; no live Stripe subscription remains.
// A member later banned or deleted is skipped for credit/grant/cancel checks (deliberately revoked).
// Test accounts (@gymnasticbodies-test.com) are skipped.
import { neon } from '@neondatabase/serverless';
import { stripe, resolveStripeCustomers, listSubscriptionsForCustomers, LIVE_SUB_STATUSES } from '@/lib/stripeServerFunction';
import { alert, claimedKeys, logEvent } from '@/lib/alerts';
import { findLastCase } from '@/lib/support/caseFor';

let _sql = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));

export const PROMISE_EVENTS = ['admin.refund', 'admin.cancel_subscription', 'admin.billing_credit', 'admin.grant_access', 'admin.account_deleted', 'admin.member_banned'];
const FLAG_EVENT = 'promise_check.flagged';
const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING_GRACE_MS = 3 * DAY_MS;
const DATE_SLACK_MS = 36 * 60 * 60 * 1000; // promised dates are days; allow timezone/rounding slack
const ENDED_SUB = ['canceled', 'incomplete_expired'];

const isTest = (email) => /@gymnasticbodies-test\.com$/i.test(String(email || ''));
const usd = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const day = (t) => (t ? new Date(t).toISOString().slice(0, 10) : '—');
const parse = (d) => { let x = d; for (let i = 0; i < 2; i++) if (typeof x === 'string') { try { x = JSON.parse(x); } catch { break; } } return x; };
const toMs = (v) => { if (!v || v === 'N/A') return null; const t = new Date(v).getTime(); return Number.isFinite(t) ? t : null; };

const ok = (note) => ({ ok: true, ...(note ? { note } : {}) });
const skip = (why) => ({ ok: true, skipped: why });
const bad = (problem, lines = [], stripeIds = {}) => ({ ok: false, problem, lines, stripe: stripeIds });

function makeCtx() {
  const subs = new Map();
  return {
    async sub(id) {
      if (!subs.has(id)) subs.set(id, stripe.subscriptions.retrieve(id).catch((e) => (e?.code === 'resource_missing' ? null : Promise.reject(e))));
      return subs.get(id);
    },
    async user({ userId, email }) {
      const e = String(email || '').toLowerCase().trim();
      const [u] = await db()`SELECT id, email, banned, migration_type FROM "user" WHERE id = ${userId || ''} OR (${e} <> '' AND lower(email) = ${e}) ORDER BY (id = ${userId || ''}) DESC LIMIT 1`;
      return u || null;
    },
    async renewaldate(userId) {
      if (!userId) return null;
      const rows = await db()`SELECT data FROM user_setting WHERE user_id = ${userId} AND type = 'subscription'`;
      const dates = rows.map((r) => toMs(parse(r.data)?.renewaldate)).filter(Boolean);
      return dates.length ? Math.max(...dates) : null;
    },
    // Live (billing) subscriptions across every Stripe customer we can tie to this member.
    async liveSubs(email, extraCustomerIds = []) {
      const customers = email ? await resolveStripeCustomers(email) : [];
      const ids = new Set(customers.map((c) => c.id));
      for (const id of extraCustomerIds) if (id && !ids.has(id)) { ids.add(id); customers.push({ id }); }
      return (await listSubscriptionsForCustomers(customers)).filter((s) => LIVE_SUB_STATUSES.includes(s.status));
    },
  };
}

// --- refunds --------------------------------------------------------------------------------
async function checkRefundId(refundId, chargeId) {
  if (!refundId) {
    if (!chargeId) return skip('no refund or charge id recorded');
    const ch = await stripe.charges.retrieve(chargeId);
    return ch.amount_refunded > 0 ? ok('no refund id recorded; charge shows a refund') : bad('Refund recorded but no Stripe refund id, and the charge shows nothing refunded', [`Charge ${usd(ch.amount)}, refunded ${usd(ch.amount_refunded)}`], { charge: chargeId, customer: ch.customer });
  }
  const r = await stripe.refunds.retrieve(refundId);
  const cid = typeof r.charge === 'string' ? r.charge : r.charge?.id;
  const ids = { refund: refundId, charge: cid };
  if (r.status === 'succeeded') {
    const ch = cid ? await stripe.charges.retrieve(cid) : null;
    if (ch && ch.amount_refunded < r.amount) return bad(`Refund says succeeded but the charge shows only ${usd(ch.amount_refunded)} refunded`, [], { ...ids, customer: ch.customer });
    return ok();
  }
  const ageMs = Date.now() - r.created * 1000;
  if (['failed', 'canceled'].includes(r.status)) {
    return bad(`Refund ${r.status} (${r.failure_reason || 'no reason given'}) — member was told they were refunded`, [`Amount ${usd(r.amount)}, created ${day(r.created * 1000)}`], ids);
  }
  if (ageMs > PENDING_GRACE_MS) return bad(`Refund still ${r.status} after ${Math.floor(ageMs / DAY_MS)} days`, [`Amount ${usd(r.amount)}, created ${day(r.created * 1000)}`], ids);
  return ok(`refund ${r.status}, ${Math.floor(ageMs / DAY_MS)}d old`);
}

// --- per event --------------------------------------------------------------------------------
const checks = {
  async 'admin.refund'(row) {
    return checkRefundId(row.data?.refundId, row.data?.chargeId);
  },

  async 'admin.cancel_subscription'(row, ctx) {
    const d = row.data || {};
    const subId = d.stripeSubscriptionId;
    const problems = [];
    const ids = { subscription: subId };
    if (subId) {
      const sub = await ctx.sub(subId);
      if (!sub) problems.push(`subscription ${subId} not found in Stripe`);
      else {
        ids.customer = sub.customer;
        const cancelling = ENDED_SUB.includes(sub.status) || sub.cancel_at_period_end || !!sub.cancel_at;
        if (!cancelling) problems.push(`Stripe subscription is still ${sub.status} and NOT set to cancel`);
      }
      const settings = await db()`SELECT status FROM user_setting WHERE stripe_subscription_id = ${subId}`;
      if (settings.length && !settings.some((s) => ['cancelled', 'pending_cancel'].includes(s.status))) {
        problems.push(`Neon still shows status "${settings.map((s) => s.status).join('/')}" for this subscription`);
      }
    } else if (row.user_id) {
      const settings = await db()`SELECT status FROM user_setting WHERE user_id = ${row.user_id} AND type = 'subscription'`;
      if (settings.length && !settings.some((s) => ['cancelled', 'pending_cancel'].includes(s.status))) {
        problems.push(`no Stripe subscription recorded and Neon shows status "${settings.map((s) => s.status).join('/')}"`);
      }
    } else return skip('no subscription id or user id recorded');
    return problems.length ? bad('Cancelled per our records, but it is not', problems, ids) : ok();
  },

  async 'admin.billing_credit'(row, ctx) {
    const d = row.data || {};
    const promised = toMs(d.to);
    if (!promised) return skip('no promised date recorded');
    let trialEnd = null, status = null, customer = null;
    if (d.subscription) {
      const sub = await ctx.sub(d.subscription);
      trialEnd = sub?.trial_end ? sub.trial_end * 1000 : null; status = sub?.status || 'missing'; customer = sub?.customer || null;
    }
    if (trialEnd && trialEnd >= promised - DATE_SLACK_MS) return ok();
    const u = await ctx.user({ userId: row.user_id, email: row.email });
    const renew = await ctx.renewaldate(u?.id);
    if (renew && renew >= promised - DATE_SLACK_MS) return ok();
    return bad(`Credit to ${day(promised)} not in place`, [
      `Stripe trial_end: ${day(trialEnd)}${d.subscription ? ` (subscription ${status})` : ''}`,
      `Neon renewaldate: ${day(renew)}`,
      d.reason ? `Reason given: ${d.reason}` : null,
    ], { subscription: d.subscription, customer });
  },

  async 'admin.grant_access'(row, ctx) {
    const d = row.data || {};
    const promised = toMs(d.to || d.expiresAt);
    if (!promised) return skip('no promised date recorded');
    const u = await ctx.user({ userId: row.user_id, email: row.email });
    if (!u) return skip('account no longer exists');
    const renew = await ctx.renewaldate(u.id);
    if (renew && renew >= promised - DATE_SLACK_MS) return ok();
    const live = await ctx.liveSubs(u.email);
    const best = Math.max(0, ...live.map((s) => (s.trial_end || 0) * 1000));
    if (best && best >= promised - DATE_SLACK_MS) return ok('covered by Stripe trial_end');
    return bad(`Access to ${day(promised)} not in place`, [
      `Neon renewaldate: ${day(renew)} · Neon status: ${u.migration_type}`,
      d.reason ? `Reason given: ${d.reason}` : null,
    ]);
  },

  async 'admin.account_deleted'(row, ctx) {
    const d = row.data || {};
    const problems = [];
    if (d.userId) {
      const [still] = await db()`SELECT id FROM "user" WHERE id = ${d.userId}`;
      if (still) problems.push(`Neon user row ${d.userId} still exists`);
    }
    const kept = parse(d.meta)?.stripeCustomersKept || [];
    const live = await ctx.liveSubs(row.email, kept);
    for (const s of live) problems.push(`Stripe subscription ${s.id} is still ${s.status}`);
    return problems.length ? bad('Account "deleted" but not fully', problems, { subscription: live.map((s) => s.id), customer: [...new Set(live.map((s) => s.customer))] }) : ok();
  },

  async 'admin.member_banned'(row, ctx) {
    const d = row.data || {};
    const problems = [];
    const emails = [...new Set([...(d.accounts || []), row.email].filter(Boolean).map((e) => e.toLowerCase()))];
    for (const e of emails) {
      const [u] = await db()`SELECT id, banned FROM "user" WHERE lower(email) = ${e}`;
      if (u && !u.banned) problems.push(`account ${e} is NOT banned`);
    }
    const live = await ctx.liveSubs(row.email, d.customers || []);
    for (const s of live) problems.push(`Stripe subscription ${s.id} is still ${s.status}`);
    return problems.length ? bad('Banned member still has access or billing', problems, { subscription: live.map((s) => s.id), customer: [...new Set(live.map((s) => s.customer))] }) : ok();
  },
};

const LABEL = {
  'admin.refund': 'refund', 'admin.cancel_subscription': 'cancellation', 'admin.billing_credit': 'billing credit',
  'admin.grant_access': 'access grant', 'admin.account_deleted': 'account deletion', 'admin.member_banned': 'ban',
};

export async function runPromiseCheck({ dryRun = false, days = 14 } = {}) {
  const sql = db();
  const ctx = makeCtx();
  // account_deleted rows carry the whole deleted record — pull only what the check needs.
  const rows = await sql`
    SELECT id, ts, event, email, user_id, source,
      CASE WHEN event = 'admin.account_deleted'
        THEN json_build_object('userId', data::jsonb->'user'->>'id', 'meta', data::jsonb->'meta')
        ELSE data END AS data
    FROM app_logs
    WHERE event = ANY(${PROMISE_EVENTS}) AND ts > now() - make_interval(days => ${days})
    ORDER BY ts`;

  // Members later banned / deleted: their credits, grants and cancels were deliberately superseded.
  const revoked = new Map(); // email -> ts
  for (const r of rows) if (['admin.member_banned', 'admin.account_deleted'].includes(r.event) && r.email) revoked.set(r.email.toLowerCase(), new Date(r.ts));
  const loggedRefunds = new Set(rows.filter((r) => r.event === 'admin.refund').map((r) => parse(r.data)?.refundId).filter(Boolean));

  const items = rows.map((r) => ({ key: `app_logs:${r.id}`, event: r.event, ts: r.ts, email: r.email, userId: r.user_id, source: r.source, row: { ...r, data: parse(r.data) || {} } }));

  // Refunds the support agent reported in fire results that never reached the admin.refund ledger.
  const fires = await sql`SELECT id, member_email, case_id, updated_at, result FROM support_fires
    WHERE updated_at > now() - make_interval(days => ${days}) AND result IS NOT NULL AND result::text LIKE '%"refund"%'`;
  for (const f of fires) {
    for (const s of parse(f.result)?.steps || []) {
      if (s.step !== 'refund' || !s.ok) continue;
      if (s.refund && loggedRefunds.has(s.refund)) continue;
      items.push({ key: `support_fires:${f.id}:${s.refund || 'none'}`, event: 'support_fire.refund', ts: f.updated_at, email: f.member_email, caseId: f.case_id, source: 'support-agent', fire: f.id, refundId: s.refund || null, chargeId: s.charge || null });
    }
  }

  const findings = [];
  const skips = [];
  const counts = { checked: 0, ok: 0, skipped: 0, mismatches: 0, errors: 0 };
  for (const it of items) {
    counts.checked++;
    let res;
    try {
      if (isTest(it.email)) res = skip('test account');
      else if (['admin.billing_credit', 'admin.grant_access', 'admin.cancel_subscription'].includes(it.event)
        && it.email && revoked.has(it.email.toLowerCase()) && revoked.get(it.email.toLowerCase()) > new Date(it.ts)) res = skip('member banned/deleted afterwards');
      else if (it.event === 'support_fire.refund') res = it.refundId ? await checkRefundId(it.refundId, it.chargeId) : bad('Support agent reported a refund with no Stripe refund id', [`Fire #${it.fire}`], { charge: it.chargeId });
      else res = await checks[it.event](it.row, ctx);
    } catch (err) {
      res = { ok: false, error: err?.message || String(err) };
    }
    if (res.error) { counts.errors++; findings.push({ key: it.key, event: it.event, email: it.email, ts: it.ts, error: res.error }); continue; }
    if (res.skipped) { counts.skipped++; skips.push({ key: it.key, event: it.event, email: it.email, why: res.skipped }); continue; }
    if (res.ok) { counts.ok++; continue; }
    counts.mismatches++;
    findings.push({ key: it.key, event: it.event, email: it.email, ts: it.ts, source: it.source, problem: res.problem, lines: (res.lines || []).filter(Boolean), stripe: res.stripe, caseId: it.caseId || null, userId: it.userId || null });
  }

  const already = await claimedKeys(FLAG_EVENT);
  const mismatches = findings.filter((f) => f.problem);
  for (const f of mismatches) f.alreadyFlagged = already.has(f.key);

  let alerted = 0;
  if (!dryRun) {
    for (const f of mismatches.filter((m) => !m.alreadyFlagged)) {
      const label = f.event === 'support_fire.refund' ? 'refund (support agent)' : LABEL[f.event] || f.event;
      const caseId = f.caseId || (f.email ? (await findLastCase({ email: f.email, userId: f.userId }))?.id : null) || null;
      const r = await alert({
        kind: 'promise_mismatch',
        severity: 'high',
        title: `Promise not kept — ${label}: ${f.problem}`,
        email: f.email,
        userId: f.userId,
        caseId,
        lines: [...f.lines, `Promised ${day(f.ts)} by ${f.source || 'unknown'} (${f.key})`],
        stripe: f.stripe || {},
        once: { event: FLAG_EVENT, key: f.key },
        data: { sourceEvent: f.event, sourceKey: f.key },
      });
      if (r.ok && !r.duplicate) alerted++;
    }
    // Errors are not mismatches (a Stripe blip is not a broken promise) — one summary alert so they
    // are not silent either.
    const errs = findings.filter((f) => f.error);
    if (errs.length) {
      await alert({ kind: 'promise_check_errors', severity: 'info', title: `Promise check: ${errs.length} item(s) could not be checked`, lines: errs.slice(0, 10).map((e) => `${e.key} ${e.email || ''}: ${e.error}`) });
    }
    await logEvent('promise_check.run', { days, ...counts, alerted });
  }

  return { dryRun, days, ...counts, alerted, findings, skips };
}
