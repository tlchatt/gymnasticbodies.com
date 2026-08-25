// The hardcoded execution layer for the cloud ("back" of the gate). NO AI, NO bot. Given a play
// whose 5-minute fuse elapsed, it performs the writes using the APP's own paths (SendGrid reply,
// Stripe, DB) — not the local CLIs. The Slack Accept + undo window IS the authorization.
// Every step is caught; a partial failure is recorded, never thrown away.
//
// refund + cancel (raw Stripe money) live in ./execute.money.js, loaded if present — otherwise
// those actions flag for a human. This keeps the sensitive money code isolated.
import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';

let _sql = null, _stripe = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));
const stripe = () => (_stripe ||= new Stripe(process.env.STRIPE_SECRET_KEY));
const parse = (d) => { let x = d; for (let i = 0; i < 2; i++) if (typeof x === 'string') { try { x = JSON.parse(x); } catch { break; } } return x; };
const addTime = (base, { months, days }) => { const d = new Date(base); if (months) d.setMonth(d.getMonth() + Number(months)); if (days) d.setDate(d.getDate() + Number(days)); return d; };

let money = {};
try { money = (await import('./execute.money.js')).default; } catch { /* not enabled yet */ }

// Find an active/trialing Stripe subscription for the email (don't trust Neon's stripeSubscriptionId).
async function findActiveSub(email) {
  const custs = await stripe().customers.list({ email, limit: 10 });
  for (const c of custs.data) {
    const subs = await stripe().subscriptions.list({ customer: c.id, status: 'all', limit: 10 });
    const sub = subs.data.find((s) => s.status === 'active' || s.status === 'trialing');
    if (sub) return sub;
  }
  return null;
}

const handlers = {
  // Customer reply — SendGrid from support@, recorded in support_replies, email marked replied.
  async reply(email, response) {
    if (!process.env.SENDGRID_API_KEY) throw new Error('SENDGRID_API_KEY not set');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const [t] = await db()`SELECT id, subject FROM support_emails WHERE lower(from_email)=${email} ORDER BY received_at DESC LIMIT 1`;
    const subject = t?.subject ? (t.subject.startsWith('Re:') ? t.subject : `Re: ${t.subject}`) : 'Regarding your GymnasticBodies account';
    await sgMail.send({ to: email, from: 'support@gymnasticbodies.com', replyTo: 'support@gymnasticbodies.com', subject, text: response.trim() });
    if (t) {
      await db()`INSERT INTO support_replies (email_id, admin_user_id, body, gmail_message_id) VALUES (${t.id}, ${process.env.SUPPORT_AGENT_USER_ID || null}, ${response.trim()}, NULL)`;
      await db()`UPDATE support_emails SET status='replied', replied_at=now() WHERE id=${t.id}`;
    }
    return { ticket: t?.id || null };
  },
  // Credit = added access. Payer -> push the live sub's trial_end; paywalled -> push renewaldate.
  async credit(email, p) {
    const sub = await findActiveSub(email);
    if (sub) {
      const base = sub.trial_end ? sub.trial_end * 1000 : Date.now();
      const trialEnd = Math.floor(addTime(base, p).getTime() / 1000);
      await stripe().subscriptions.update(sub.id, { trial_end: trialEnd, proration_behavior: 'none' });
      return { via: 'trial_end', sub: sub.id, until: new Date(trialEnd * 1000).toISOString().slice(0, 10) };
    }
    const [u] = await db()`SELECT id FROM "user" WHERE lower(email)=${email} LIMIT 1`;
    if (!u) throw new Error('no account');
    const [s] = await db()`SELECT id, data FROM user_setting WHERE user_id=${u.id} AND type='subscription' LIMIT 1`;
    const data = parse(s?.data) || {};
    const base = data.renewaldate && !isNaN(Date.parse(data.renewaldate)) ? new Date(data.renewaldate) : new Date();
    data.renewaldate = addTime(base, p).toISOString().slice(0, 10);
    if (s) await db()`UPDATE user_setting SET data=${JSON.stringify(data)} WHERE id=${s.id}`;
    await db()`UPDATE "user" SET migration_type='current' WHERE id=${u.id}`;
    return { via: 'renewaldate', until: data.renewaldate };
  },
  // Grant access — DB only: ensure current + a renewal date.
  async grant(email, p) {
    const [u] = await db()`SELECT id FROM "user" WHERE lower(email)=${email} LIMIT 1`;
    if (!u) throw new Error('no account');
    let until = p.until || null;
    if (!until && (p.months || p.days)) until = addTime(new Date(), p).toISOString().slice(0, 10);
    if (!until) until = '2099-12-31';
    await db()`UPDATE "user" SET migration_type='current' WHERE id=${u.id}`;
    const [s] = await db()`SELECT id, data FROM user_setting WHERE user_id=${u.id} AND type='subscription' LIMIT 1`;
    if (s) { const data = parse(s.data) || {}; data.renewaldate = until; await db()`UPDATE user_setting SET data=${JSON.stringify(data)} WHERE id=${s.id}`; }
    return { granted_until: until };
  },
  // Case management — DB only.
  async merge_cases(email, p, caseId) {
    const cases = await db()`SELECT id FROM support_cases WHERE lower(from_email)=${email} AND status IN ('open','reopened','pending') ORDER BY id DESC`;
    if (cases.length < 2) return { note: 'nothing to merge (<2 open cases)' };
    const survivor = p.into || caseId || cases[0].id;
    const losers = cases.map((c) => c.id).filter((id) => id !== survivor);
    for (const id of losers) {
      await db()`UPDATE support_emails SET case_id=${survivor} WHERE case_id=${id}`;
      await db()`UPDATE support_cases SET status='closed', admin_notes=COALESCE(admin_notes || chr(10), '') || ${'[merged into #' + survivor + ']'} WHERE id=${id}`;
    }
    return { merged_into: survivor, closed: losers };
  },
  async close_case(email, p, caseId) { const id = p.case_id || caseId; if (!id) throw new Error('no case'); await db()`UPDATE support_cases SET status='closed', resolved_at=now() WHERE id=${id}`; return { closed: id }; },
  async reopen(email, p, caseId) { const id = p.case_id || caseId; if (!id) throw new Error('no case'); await db()`UPDATE support_cases SET status='reopened' WHERE id=${id}`; return { reopened: id }; },
  async reassign(email, p, caseId) { const id = p.case_id || caseId; if (!id) throw new Error('no case'); await db()`UPDATE support_cases SET assigned_to=${p.assigned_to || null} WHERE id=${id}`; return { reassigned: id, to: p.assigned_to || null }; },
};
for (const type of ['refund', 'cancel']) handlers[type] = money[type] || (async () => ({ note: `${type} not enabled yet — run by hand (execute.money.js)` }));

// Execute one play. Returns { ok, steps:[...] } — never throws.
export async function executePlay({ member_email, response, actions, case_id }) {
  const email = String(member_email || '').toLowerCase().trim();
  const steps = [];
  if (response && response.trim()) {
    try { const r = await handlers.reply(email, response); steps.push({ step: 'reply', ok: true, ...r }); }
    catch (e) { steps.push({ step: 'reply', ok: false, error: String(e.message).slice(0, 300) }); }
  }
  for (const a of (actions || [])) {
    if (a.type === 'reply' || a.type === 'none') continue;
    const h = handlers[a.type];
    if (!h) { steps.push({ step: a.type, ok: false, note: 'unknown action type — skipped' }); continue; }
    try { const r = await h(email, a.params || {}, case_id); steps.push({ step: a.type, ok: true, ...r }); }
    catch (e) { steps.push({ step: a.type, ok: false, error: String(e.message).slice(0, 300) }); }
  }
  return { ok: steps.every((s) => s.ok || s.note), steps };
}
