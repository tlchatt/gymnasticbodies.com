// The hardcoded execution layer for the cloud ("back" of the gate). NO AI, NO bot. Given a play
// whose 5-minute fuse elapsed, it performs the writes using the APP's own paths (SendGrid reply,
// Stripe, DB) — not the local CLIs. The Slack Accept + undo window IS the authorization.
// Every step is caught; a partial failure is recorded, never thrown away.
//
// refund + cancel (raw Stripe money) live in ./execute.money.js and share their cores with the
// admin routes. Every handler THROWS when its action did not actually happen; executePlay then
// holds the customer reply (see executePlay).
import { neon } from '@neondatabase/serverless';
import { slack } from '@/lib/support/slack';
import { getOffer } from '@/lib/pricing';
import { stripe as stripeClient, LIVE_SUB_STATUSES, listSubscriptionsForCustomers } from '@/lib/stripeServerFunction';
import { cancelStripeSubscription } from '@/lib/adminSubscription';
import { logger } from '@/lib/logger';
import money, { memberContext } from './execute.money.js';
import { sendCaseEmail, replySubject } from './sendSupport.js';
import { caseForOutbound } from './caseFor.js';

let _sql = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));
const stripe = () => stripeClient;
const parse = (d) => { let x = d; for (let i = 0; i < 2; i++) if (typeof x === 'string') { try { x = JSON.parse(x); } catch { break; } } return x; };
const addTime = (base, { months, days }) => { const d = new Date(base); if (months) d.setUTCMonth(d.getUTCMonth() + Number(months)); if (days) d.setUTCDate(d.getUTCDate() + Number(days)); return d; };
const iso = (t) => new Date(t * 1000).toISOString().slice(0, 10);

// The agent names durations many ways (months, credit_months, days, credit_days, duration_days,
// weeks, amount: "1 week"). Before this, anything but months/days was silently read as ZERO —
// eight production credits added no time at all. Returns { months, days } (days includes weeks).
export function durationOf(p = {}) {
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  let months = num(p.months ?? p.credit_months ?? 0);
  let days = num(p.days ?? p.credit_days ?? p.duration_days ?? 0) + 7 * num(p.weeks ?? p.credit_weeks ?? 0);
  if (!months && !days && typeof p.amount === 'string') {
    const m = p.amount.match(/(\d+(?:\.\d+)?)\s*(day|week|month)/i);
    if (m) { const n = Number(m[1]); const u = m[2].toLowerCase(); if (u === 'month') months = n; else days = u === 'week' ? n * 7 : n; }
  }
  return { months, days };
}

// The member's first live subscription across ALL their Stripe customers (Neon's stored
// stripe_customer_id + case-insensitive email search) — same statuses claudeTools/credit.js uses.
// With several live subs, prefer the one Neon records, then a paid 'active' one over a trial.
async function findActiveSub(email) {
  const { customers, setting } = await memberContext(email);
  const live = (await listSubscriptionsForCustomers(customers)).filter((s) => LIVE_SUB_STATUSES.includes(s.status));
  return live.find((s) => s.id === setting?.stripeSubscriptionId) || live.find((s) => s.status === 'active') || live[0] || null;
}

const handlers = {
  // Customer reply — on the PLAY'S case (not "the member's latest message by email"), sent from
  // support@ with the case id in its Message-ID, and ALWAYS recorded (lib/support/sendSupport.js):
  // on the case's latest inbound message when there is one and an agent user id is configured,
  // otherwise as an outbound_emails row (type 'support', case_id). A play with no case (only
  // pre-2026-10-09 rows) goes on the member's open case or a new one — never sent unrecorded.
  async reply(email, response, caseId) {
    let cid = caseId ? Number(caseId) : null;
    let caseNote = null;
    if (!cid) { const c = await caseForOutbound({ email, title: 'Support reply' }); cid = c.caseId; caseNote = `no case on the play — ${c.action} case #${cid}`; }
    const [t] = await db()`SELECT id, subject FROM support_emails WHERE case_id=${cid} ORDER BY received_at DESC LIMIT 1`;
    const [c] = t ? [] : await db()`SELECT title FROM support_cases WHERE id=${cid}`;
    const subject = replySubject(t?.subject || c?.title);
    const r = await sendCaseEmail({ to: email, subject, text: response, caseId: cid, emailId: t?.id || null, adminUserId: process.env.SUPPORT_AGENT_USER_ID || null, sql: db() });
    return { case: cid, ticket: t?.id || null, messageId: r.messageId, recordedIn: r.recordedIn, recorded: r.recorded, ...(caseNote ? { caseNote } : {}) };
  },
  // Credit = added access. Payer -> push the live sub's trial_end; paywalled -> push renewaldate.
  // Mirrors claudeTools/credit.js, with one correction: the base is the LATEST of now, the
  // sub's trial_end and its current_period_end. credit.js used trial_end || period_end, so an
  // old, expired trial_end made Stripe reject the new trial_end as "in the past" (fires 16, 238)
  // — or, worse, accept a trial_end BEFORE the paid period end, moving the next charge earlier.
  async credit(email, p) {
    const dur = durationOf(p);
    if (!dur.months && !dur.days) throw new Error(`credit has no duration — expected months / days / weeks in params (got ${JSON.stringify(p)})`);
    const [u] = await db()`SELECT id, email FROM "user" WHERE lower(email)=${email} LIMIT 1`;
    const [s] = u ? await db()`SELECT id, data FROM user_setting WHERE user_id=${u.id} AND type='subscription' LIMIT 1` : [];
    const sub = await findActiveSub(email);
    if (sub) {
      const item = sub.items?.data?.[0];
      const periodEnd = Number(item?.current_period_end ?? sub.current_period_end) || 0;
      const baseTs = Math.max(Math.floor(Date.now() / 1000), sub.trial_end || 0, periodEnd);
      const trialEnd = Math.floor(addTime(baseTs * 1000, dur).getTime() / 1000);
      await stripe().subscriptions.update(sub.id, { trial_end: trialEnd, proration_behavior: 'none' });
      if (s) { const data = parse(s.data) || {}; data.renewaldate = new Date(trialEnd * 1000).toISOString(); await db()`UPDATE user_setting SET data=${JSON.stringify(data)} WHERE id=${s.id}`; }
      logger.info('admin.billing_credit', { email: u?.email || email, userId: u?.id, source: 'support-agent', subscription: sub.id, ...dur, from: iso(baseTs), to: iso(trialEnd), reason: p.reason || null });
      return { via: 'trial_end', sub: sub.id, from: iso(baseTs), until: iso(trialEnd) };
    }
    if (!u) throw new Error('no account');
    if (!s) throw new Error('no subscription row — nothing to credit; provision first');
    const data = parse(s.data) || {};
    const existing = data.renewaldate && data.renewaldate !== 'N/A' ? new Date(data.renewaldate) : null;
    const base = existing && !isNaN(existing) && existing > new Date() ? existing : new Date();
    const before = data.renewaldate || null;
    data.renewaldate = addTime(base, dur).toISOString().slice(0, 10);
    await db()`UPDATE user_setting SET data=${JSON.stringify(data)} WHERE id=${s.id}`;
    await db()`UPDATE "user" SET migration_type='current' WHERE id=${u.id}`;
    logger.info('admin.grant_access', { email: u.email, userId: u.id, source: 'support-agent', ...dur, from: before, to: data.renewaldate, reason: p.reason || null });
    return { via: 'renewaldate', until: data.renewaldate };
  },
  // Grant access — DB only: ensure current + a renewal date.
  async grant(email, p) {
    const [u] = await db()`SELECT id FROM "user" WHERE lower(email)=${email} LIMIT 1`;
    if (!u) throw new Error('no account');
    let until = p.until || null;
    const dur = durationOf(p);   // duration_days / weeks etc. used to fall through to 2099-12-31
    if (!until && (dur.months || dur.days)) until = addTime(new Date(), dur).toISOString().slice(0, 10);
    if (!until) until = '2099-12-31';
    await db()`UPDATE "user" SET migration_type='current' WHERE id=${u.id}`;
    const [s] = await db()`SELECT id, data FROM user_setting WHERE user_id=${u.id} AND type='subscription' LIMIT 1`;
    if (s) { const data = parse(s.data) || {}; data.renewaldate = until; await db()`UPDATE user_setting SET data=${JSON.stringify(data)} WHERE id=${s.id}`; }
    return { granted_until: until };
  },
  // Case management — DB only.
  async merge_cases(email, p, caseId) {
    const cases = await db()`SELECT id FROM support_cases WHERE lower(from_email)=${email} AND status IN ('open','reopened','pending') ORDER BY id DESC`;
    if (cases.length < 2) return { nothing_to_merge: true, detail: 'fewer than 2 open cases' };
    const survivor = Number(p.into || p.into_case_id || p.target_case_id || p.destination_case_id || p.master_case_id || p.parent_case_id || caseId || cases[0].id);
    const losers = cases.map((c) => c.id).filter((id) => id !== survivor);
    for (const id of losers) {
      await db()`UPDATE support_emails SET case_id=${survivor} WHERE case_id=${id}`;
      await db()`UPDATE support_cases SET status='closed', admin_notes=COALESCE(admin_notes || chr(10), '') || ${'[merged into #' + survivor + ']'} WHERE id=${id}`;
    }
    return { merged_into: survivor, closed: losers };
  },
  // Escalate to engineering: flag the case, record the note, and post to the dev channel tagging
  // the engineer. The customer IS emailed that their case was escalated (executePlay sends the
  // agent's draft, or ESCALATION_NOTICE when there is none) — never that it is fixed. This is the "engineering queue": escalated items live in #gymnasticbodies-development.
  async escalate(email, p, caseId) {
    const id = p.case_id || caseId || null;
    const note = (p.note || p.summary || 'Needs an engineering fix.').trim();
    if (id) {
      await db()`UPDATE support_cases SET status=${'escalated'}, priority=${'high'} WHERE id=${id}`;
      await db()`UPDATE support_cases SET admin_notes = COALESCE(admin_notes || chr(10), ${''}) || ${'[escalated to engineering] ' + note} WHERE id=${id}`;
    }
    const ch = process.env.SLACK_DEV_CHANNEL_ID;
    if (ch) {
      const mention = process.env.SLACK_ESCALATION_USER_ID ? `<@${process.env.SLACK_ESCALATION_USER_ID}> ` : '';
      const base = process.env.SUPPORT_PUBLIC_URL || 'https://app.gymnasticbodies.com';
      const caseLink = id ? ` · <${base}/admin/cases/${id}|case ${id}>` : '';
      await slack('chat.postMessage', { channel: ch, text: `${mention}⚠️ *Engineering escalation* — *${email}*${caseLink}\n${note}\n_(customer was emailed that it is escalated — fix, then follow up with them.)_` });
    }
    return { escalated: id, notified: !!ch };
  },
  async close_case(email, p, caseId) { const id = p.case_id || caseId; if (!id) throw new Error('no case'); await db()`UPDATE support_cases SET status='closed', resolved_at=now() WHERE id=${id}`; return { closed: id }; },
  async reopen(email, p, caseId) { const id = p.case_id || caseId; if (!id) throw new Error('no case'); await db()`UPDATE support_cases SET status='open' WHERE id=${id}`; return { reopened: id }; },
  async reassign(email, p, caseId) {
    const id = p.case_id || caseId; if (!id) throw new Error('no case');
    const to = p.assigned_to || p.team || p.assignee || null;   // accept whatever the agent sends
    await db()`UPDATE support_cases SET assigned_to=${to} WHERE id=${id}`;
    // Preserve the escalation note (was previously discarded) so it's visible on the case.
    if (p.note) await db()`UPDATE support_cases SET admin_notes = COALESCE(admin_notes || chr(10), ${''}) || ${'[reassign' + (to ? ' → ' + to : '') + '] ' + p.note} WHERE id=${id}`;
    return { reassigned: id, to, noted: !!p.note, note: 'assigned_to set + note recorded; no auto-notification exists' };
  },
  // Extend the legacy offer: create the eligibility record the /offer/legacy15 page requires — an
  // outbound_emails row keyed on the LIVE offer's campaign. Without this row the offer page shows
  // "not eligible", so a legacy-offer link in a reply is dead until this runs. Idempotent: a member
  // who already has the eligibility row is a no-op.
  async legacy_offer(email, p, caseId) {
    const offer = await getOffer('legacy15');
    if (!offer || offer.active === false) throw new Error('legacy offer not active');
    const link = `https://app.gymnasticbodies.com/offer/legacy15?email=${encodeURIComponent(email)}`;
    const [existing] = await db()`SELECT id FROM outbound_emails WHERE lower(to_email)=${email} AND campaign=${offer.campaign} LIMIT 1`;
    if (existing) return { legacyOffer: 'already_eligible', campaign: offer.campaign, link };
    const [u] = await db()`SELECT id FROM "user" WHERE lower(email)=${email} LIMIT 1`;
    await db()`INSERT INTO outbound_emails (user_id, to_email, subject, body, campaign, type, case_id, sent_at)
               VALUES (${u?.id || null}, ${email}, ${'Legacy Member Offer'}, ${link}, ${offer.campaign}, 'support', ${p.case_id || caseId || null}, now())`;
    return { legacyOffer: 'created', campaign: offer.campaign, link };
  },
};
handlers.cancel = money.cancel;
handlers.refund = money.refund;

// "merge" — the agent's other name for merge_cases. But the agent has also used "merge" for an
// ACCOUNT merge (surviving_email / subsumed_email …), which nothing here can do; merging only the
// cases and reporting success would let a reply claim the accounts were merged. Refuse that shape.
handlers.merge = async (email, p, caseId) => {
  const accountKeys = ['surviving_email', 'survivor_email', 'subsumed_email', 'obsolete_email', 'merge_email', 'other_email'];
  if (accountKeys.some((k) => p[k])) throw new Error('account merge (two member accounts into one) is not automated — do it by hand');
  return handlers.merge_cases(email, p, caseId);
};

// Account deletion — the owner's erasure method: back up the full record, then HARD-delete.
// The backup is one app_logs row (event admin.account_deleted, data = every row we delete), built
// server-side in SQL so a member with thousands of workout logs never round-trips through here.
// A live Stripe subscription is cancelled immediately first (and the delete aborts if that fails).
// The Stripe customer itself is never deleted. Admin-role users are refused.
async function eraseOne(sql, u, { reason, caseId }) {
  const { customers } = await memberContext(u.email);
  const live = (await listSubscriptionsForCustomers(customers)).filter((s) => LIVE_SUB_STATUSES.includes(s.status));
  const cancelled = [];
  for (const sub of live) {
    const r = await cancelStripeSubscription({ userId: null, email: u.email, setting: null, subscriptionId: sub.id, cancelNow: true, immediate: true, actor: { source: 'support-agent' } });
    cancelled.push(r.subscriptionId);
  }
  const meta = JSON.stringify({ reason: reason || null, caseId: caseId || null, stripeCancelled: cancelled, stripeCustomersKept: customers.map((c) => c.id) });
  const [b] = await sql`
    INSERT INTO app_logs (level, event, email, user_id, source, data)
    SELECT 'info', 'admin.account_deleted', u.email, u.id, 'support-agent', json_build_object(
      'deletedAt', now(), 'meta', ${meta}::json,
      'user', row_to_json(u),
      'user_setting', (SELECT coalesce(json_agg(x), '[]') FROM user_setting x WHERE x.user_id = u.id),
      'account',      (SELECT coalesce(json_agg(x), '[]') FROM account x WHERE x.user_id = u.id),
      'session',      (SELECT coalesce(json_agg(x), '[]') FROM session x WHERE x.user_id = u.id),
      'user_logs',    (SELECT coalesce(json_agg(x), '[]') FROM user_logs x WHERE x.user_id = u.id))
    FROM "user" u WHERE u.id = ${u.id}
    RETURNING id`;
  if (!b?.id) throw new Error(`backup row was not written for ${u.email} — nothing deleted`);
  const id = u.id;
  const count = (rows) => Number(rows?.[0]?.n ?? 0);
  const r = await sql.transaction([
    sql`UPDATE support_emails SET user_id = NULL WHERE user_id = ${id}`,
    sql`UPDATE support_emails SET assigned_to = NULL WHERE assigned_to = ${id}`,
    sql`UPDATE support_cases SET user_id = NULL WHERE user_id = ${id}`,
    sql`UPDATE support_cases SET opened_by = NULL WHERE opened_by = ${id}`,
    sql`UPDATE outbound_emails SET user_id = NULL WHERE user_id = ${id}`,
    sql`UPDATE campaigns SET created_by = NULL WHERE created_by = ${id}`,
    sql`DELETE FROM verification WHERE identifier = ${'change-email:' + id}`,
    sql`WITH d AS (DELETE FROM user_logs WHERE user_id = ${id} RETURNING 1) SELECT count(*)::int n FROM d`,
    sql`WITH d AS (DELETE FROM user_setting WHERE user_id = ${id} RETURNING 1) SELECT count(*)::int n FROM d`,
    sql`WITH d AS (DELETE FROM account WHERE user_id = ${id} RETURNING 1) SELECT count(*)::int n FROM d`,
    sql`WITH d AS (DELETE FROM session WHERE user_id = ${id} RETURNING 1) SELECT count(*)::int n FROM d`,
    sql`WITH d AS (DELETE FROM "user" WHERE id = ${id} RETURNING 1) SELECT count(*)::int n FROM d`,
  ]);
  const deleted = { user_logs: count(r[7]), user_setting: count(r[8]), account: count(r[9]), session: count(r[10]), user: count(r[11]) };
  if (deleted.user !== 1) throw new Error(`user row for ${u.email} was not deleted (backup app_logs #${b.id})`);
  return { email: u.email, userId: id, backup: `app_logs #${b.id}`, deleted, stripeCancelled: cancelled };
}
handlers.delete = async (email, p, caseId) => {
  const sql = db();
  const wanted = [...new Set([email, p.email, ...(Array.isArray(p.emails) ? p.emails : [])]
    .filter((x) => typeof x === 'string' && x.includes('@')).map((x) => x.toLowerCase().trim()))];
  const done = [], missing = [], errors = [];
  for (const em of wanted) {
    const users = await sql`SELECT id, email, role FROM "user" WHERE lower(email) = ${em}`;
    if (!users.length) { missing.push(em); continue; }
    for (const u of users) {
      if (u.role === 'admin') { errors.push(`${u.email}: admin account — refusing to delete`); continue; }
      try { done.push(await eraseOne(sql, u, { reason: p.reason, caseId: p.case_id || caseId })); }
      catch (e) { errors.push(`${u.email}: ${e.message}`); }
    }
  }
  if (errors.length) { const err = new Error(errors.join('; ')); err.partial = { deleted: done, not_found: missing }; throw err; }
  return { deleted: done, ...(missing.length ? { not_found: missing } : {}), ...(!done.length ? { nothing_to_delete: true } : {}) };
};

// Execute one play. Returns { ok, held, steps:[...] } — never throws.
// Order: every account / money / case action FIRST (except close_case); then the customer reply,
// ONLY if every action succeeded; then close_case, only after that. A failed or unknown action
// stops the remaining actions, HOLDS the reply (draft kept, not sent) and leaves the case open —
// so a member is never told "you're cancelled" when the cancel did not happen.
// ok = every step ok. (Notes no longer count as success.) An escalation always emails the member
// that their case went to engineering (owner rule 2026-10-08): the draft if there is one, else
// ESCALATION_NOTICE — escalating used to hold the reply, which left members unanswered for weeks.
const ESCALATION_NOTICE = (first) => `Hi ${first || 'there'},

Thanks for letting us know. We've looked into this, and it's a problem on our end that needs a fix from our engineering team, so we've escalated your case to them. We'll email you as soon as it's resolved.

If anything changes in the meantime, just reply to this email.

Best,
GymnasticBodies Support`;

export async function executePlay({ member_email, response, actions, case_id }) {
  const email = String(member_email || '').toLowerCase().trim();
  const steps = [];
  const acts = (actions || []).filter((a) => a && a.type && a.type !== 'reply' && a.type !== 'none');
  const closers = acts.filter((a) => a.type === 'close_case');
  const work = acts.filter((a) => a.type !== 'close_case');
  const escalated = work.some((a) => a.type === 'escalate');

  let failed = null;
  for (const a of work) {
    if (failed) { steps.push({ step: a.type, ok: false, skipped: true, note: `skipped — ${failed} failed first` }); continue; }
    const h = handlers[a.type];
    if (!h) { steps.push({ step: a.type, ok: false, error: 'unknown action type — not executed' }); failed = a.type; continue; }
    try { const r = await h(email, a.params || {}, case_id); steps.push({ step: a.type, ok: true, ...r }); }
    catch (e) { steps.push({ step: a.type, ok: false, error: String(e.message).slice(0, 400), ...(e.partial ? { partial: e.partial } : {}) }); failed = a.type; }
  }

  if (escalated && !failed && !(response && response.trim())) {
    const [u] = await db()`SELECT name FROM "user" WHERE lower(email)=${email} LIMIT 1`;
    response = ESCALATION_NOTICE(String(u?.name || '').trim().split(/\s+/)[0]);
  }
  const hasReply = !!(response && response.trim());
  const held = failed ? 'action_failed' : null;
  if (hasReply && held) {
    steps.push({ step: 'reply', ok: false, held: true, note: `held — ${failed} failed (draft kept, not sent)` });
  } else if (hasReply) {
    try { const r = await handlers.reply(email, response, case_id); steps.push({ step: 'reply', ok: true, ...(escalated ? { escalationNotice: true } : {}), ...r }); }
    catch (e) { steps.push({ step: 'reply', ok: false, error: String(e.message).slice(0, 300) }); failed = 'reply'; }
  }

  for (const a of closers) {
    if (failed) { steps.push({ step: 'close_case', ok: false, skipped: true, note: `not closed — ${failed} failed` }); continue; }
    try { const r = await handlers.close_case(email, a.params || {}, case_id); steps.push({ step: 'close_case', ok: true, ...r }); }
    catch (e) { steps.push({ step: 'close_case', ok: false, error: String(e.message).slice(0, 300) }); }
  }
  return { ok: steps.every((s) => s.ok === true), held, steps };
}
