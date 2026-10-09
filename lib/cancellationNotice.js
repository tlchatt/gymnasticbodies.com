// "Your subscription is cancelled" — sent on EVERY cancel path, exactly ONCE per subscription
// (owner 2026-10-09; claudePlans/communication-flows.md A7):
//   - member Cancel            /api/stripe/cancel-subscription
//   - admin + support agent    lib/adminSubscription.js cancelStripeSubscription
//   - Stripe                   customer.subscription.deleted webhook (dashboard cancels, period end)
// A period-end cancel says access continues until the period end; an immediate/trial cancel (and
// the webhook, which fires when the subscription has actually ended) says access has ended.
// A ban (lib/blocklist.js banMember) must NOT send it: banMember marks each subscription suppressed
// before cancelling, and banned members are skipped here as well.
//
// Dedupe: an app_logs marker per subscription id, written (awaited — the logger is fire-and-forget)
// BEFORE the send so the webhook that follows an admin cancel by a second finds it.
// Administrative email: recorded in outbound_emails by sendSubsCancelledEmailSG. Not a case.
import { neon } from '@neondatabase/serverless';
import { sendSubsCancelledEmailSG } from '@/lib/sendgrid';

let _sql = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));

const NOTIFIED = 'subscription_cancelled.member_notified';
const SUPPRESSED = 'subscription_cancelled.notice_suppressed';

const parse = (d) => { let x = d; for (let i = 0; i < 2; i++) if (typeof x === 'string') { try { x = JSON.parse(x); } catch { break; } } return x; };

async function marker(subscriptionId) {
  // app_logs.data is json: fetch the (few) marker rows and match in JS.
  const rows = await db()`SELECT event, data FROM app_logs WHERE event IN (${NOTIFIED}, ${SUPPRESSED}) AND ts > now() - interval '400 days'`;
  return rows.find((r) => parse(r.data)?.subscriptionId === subscriptionId)?.event || null;
}

async function writeMarker(event, { subscriptionId, email, userId, ...rest }) {
  const [r] = await db()`INSERT INTO app_logs (level, event, email, user_id, source, data)
             VALUES ('info', ${event}, ${email || null}, ${userId || null}, 'app.gymnasticbodies.com', ${JSON.stringify({ subscriptionId, ...rest })}::json) RETURNING id`;
  return r?.id;
}

// Called by banMember before it cancels: the member gets no "cancelled" email for a ban.
export async function suppressCancellationNotice({ subscriptionId, email = null, reason = 'ban' }) {
  if (!subscriptionId) return;
  try { if (!(await marker(subscriptionId))) await writeMarker(SUPPRESSED, { subscriptionId, email, reason }); }
  catch (err) { console.error(JSON.stringify({ level: 'error', event: 'subscription_cancelled.suppress_failed', subscriptionId, error: err.message })); }
}

// { subscriptionId, email?, userId?, accessUntil? (unix seconds / Date / ISO; set = period-end), source }
// Returns { sent: true } | { sent: false, reason }. Never throws — a notice must not fail a cancel.
export async function notifySubscriptionCancelled({ subscriptionId, email = null, userId = null, accessUntil = null, source = null }) {
  try {
    if (!subscriptionId) return { sent: false, reason: 'no_subscription_id' };
    let to = email, uid = userId, banned = false;
    const [u] = userId
      ? await db()`SELECT id, email, banned FROM "user" WHERE id = ${userId} LIMIT 1`
      : (email ? await db()`SELECT id, email, banned FROM "user" WHERE lower(email) = ${String(email).toLowerCase()} LIMIT 1` : []);
    if (u) { to = to || u.email; uid = uid || u.id; banned = !!u.banned; }
    if (!to) return { sent: false, reason: 'no_email' };
    if (banned) return { sent: false, reason: 'banned' };
    const seen = await marker(subscriptionId);
    if (seen) return { sent: false, reason: seen === SUPPRESSED ? 'suppressed' : 'already_notified' };
    const markId = await writeMarker(NOTIFIED, { subscriptionId, email: to, userId: uid, accessUntil, source });
    const ok = await sendSubsCancelledEmailSG(to, { accessUntil, userId: uid });
    if (!ok) {
      // Not sent — drop the claim so a later path (e.g. the webhook) can still send it.
      await db()`DELETE FROM app_logs WHERE id = ${markId}`;
      await writeMarker('subscription_cancelled.notice_failed', { subscriptionId, email: to, userId: uid, source });
      return { sent: false, reason: 'send_failed' };
    }
    return { sent: true };
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', event: 'subscription_cancelled.notice_error', subscriptionId, error: err.message }));
    return { sent: false, reason: err.message };
  }
}
