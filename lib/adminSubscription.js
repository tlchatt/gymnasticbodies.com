import { db } from '@/Drizzle/index.ts';
import { app_logs, support_cases, user } from '@/Drizzle/db/schema';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { stripe } from '@/lib/stripeServerFunction';
import { isSubscriptionActive, subscriptionStatusLabel, cleanPlanName } from '@/lib/subscription';
import { logger } from '@/lib/logger';
import { updateUserSettingStatus, updateUserClassification } from '@/lib/userSettings';

// Records an admin action (credit, password reset, extension, refund, cancel)
// onto the user's most recent EXISTING open/pending support case, as an appended
// admin_notes line: `[admin action YYYY-MM-DD by <adminUserId>] <title> — <detail>`.
// Does NOT create standalone cases (per owner 2026-07-24): if the user has no
// open/pending case this is a no-op — the action still shows on the member's
// account Activity log (sourced from app_logs), which is the record of truth for
// standalone/proactive actions. Called AFTER the real action succeeds, so it is
// purely additive, and it never throws — a case-logging failure must never break
// the underlying action.
//   - userId: the acted-on user (required; no-op when absent)
//   - title / detail: what happened, rendered into the appended note line
//   - adminUserId: the acting admin's user.id, included in the note when provided
export async function createAdminActionCase({ userId, title, detail, adminUserId }) {
  try {
    if (!userId) return;
    const rows = await db
      .select({ id: support_cases.id, adminNotes: support_cases.adminNotes })
      .from(support_cases)
      .where(and(eq(support_cases.userId, userId), inArray(support_cases.status, ['open', 'pending', 'reopened'])))
      .orderBy(desc(support_cases.createdAt))
      .limit(1);
    if (!rows.length) return; // no open case → nothing to append to

    const stamp = new Date().toISOString().slice(0, 10);
    const by = adminUserId ? ` by ${adminUserId}` : '';
    const line = `[admin action ${stamp}${by}] ${title}${detail ? ' — ' + detail : ''}`;
    const merged = `${rows[0].adminNotes ? rows[0].adminNotes + '\n' : ''}${line}`;
    await db.update(support_cases)
      .set({ adminNotes: merged, updatedAt: new Date() })
      .where(eq(support_cases.id, rows[0].id));
  } catch (err) {
    try { logger.error('admin.case_append_failed', { userId, title, error: err?.message }); } catch {}
  }
}

// Builds a human-readable subscription summary for the admin case + user
// screens: what they pay, where their access comes from, live Stripe status,
// and whether they converted from a marketing offer. Shared by
// /api/admin/cases/[id] and /api/admin/users/[id] so both stay in sync.
export async function buildSubscriptionSummary(setting, userId) {
  if (!setting) return null;

  let data = {};
  try { data = typeof setting.data === 'string' ? JSON.parse(setting.data || '{}') : (setting.data ?? {}); }
  catch { data = {}; }

  const isStripe = !!setting.stripeSubscriptionId;
  const isAuthNet = !!setting.authorizeSubscriptionId;

  let stripeLive = null;
  if (isStripe) {
    try {
      const sub = await stripe.subscriptions.retrieve(setting.stripeSubscriptionId, { expand: ['items.data.price'] });
      const item = sub.items?.data?.[0];
      const price = item?.price;
      const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;
      stripeLive = {
        status: sub.status,
        amount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        interval: price?.recurring?.interval ?? null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      };
    } catch { stripeLive = { error: true }; }
  }

  // Did they convert from a marketing offer?
  let offerConversion = null;
  const conv = await db
    .select({ ts: app_logs.ts, data: app_logs.data })
    .from(app_logs)
    .where(and(eq(app_logs.userId, userId), eq(app_logs.event, 'offer.success')))
    .orderBy(desc(app_logs.ts))
    .limit(1);
  if (conv.length) {
    const d = conv[0].data || {};
    offerConversion = { slug: d.slug ?? null, price: d.price ?? null, term: d.term ?? null, at: conv[0].ts };
  }

  const accessSource = isStripe ? 'stripe' : isAuthNet ? 'auth_net' : (data.renewaldate ? 'legacy_renewaldate' : 'unknown');

  // Active/Expired is derived from the expiration date (data.renewaldate),
  // OR'd with a live Stripe status when we have one — NOT the raw
  // setting.status / data.status string (set unreliably by imports/grants).
  const stripeStatus = stripeLive && !stripeLive.error ? stripeLive.status : undefined;
  const isActive = isSubscriptionActive({ renewaldate: data.renewaldate, stripeStatus });

  return {
    accessSource,
    isStripe,
    isAuthNet,
    productName: cleanPlanName(data.productName) ?? null,
    price: data.price ?? null,
    term: data.term ?? null,
    paymentMethod: data.payment_method ?? null,
    startDate: data.startdate ?? null,
    renewalDate: data.renewaldate ?? null,
    isActive,
    settingStatus: subscriptionStatusLabel({ renewaldate: data.renewaldate, stripeStatus, trial: setting.trial, trialEndDate: setting.trialEndDate }),
    stripeLive,
    offerConversion,
  };
}

// ── Shared cancel / refund cores ─────────────────────────────────────────────
// Used by the admin routes (/api/admin/users/[id]/cancel-subscription, /refund) AND the cloud
// support agent's executor (lib/support/execute.money.js), so both do exactly the same thing.
// `actor` = { adminEmail, adminId, source } — whoever is acting, recorded in the log + case note.

const parseSettingData = (setting) => {
  if (!setting?.data) return {};
  try { return typeof setting.data === 'string' ? JSON.parse(setting.data) : (setting.data ?? {}); }
  catch { return {}; }
};

// Cancel one Stripe subscription and record it in Neon.
//   cancelNow → stripe.subscriptions.cancel (immediate); else cancel_at_period_end.
//   An already-ended sub is just recorded (Stripe answers a re-cancel with resource_missing).
// Neon: the subscription setting row gets status cancelled / pending_cancel. A period-end cancel
// leaves the member current until the paid period runs out (renewaldate = period end; the
// customer.subscription.deleted webhook / classifier lapse them then). Only an immediate or
// already-ended cancel classifies them noncurrent/lapsed now. `admin.cancel_subscription` is logged, and a note is appended to
// their open case. Throws on a Stripe error (caller logs + reports it).
export async function cancelStripeSubscription({ userId, email, setting, subscriptionId, cancelNow = false, trial = false, immediate = false, actor = {} }) {
  const current = await stripe.subscriptions.retrieve(subscriptionId);
  const alreadyEnded = ['canceled', 'incomplete_expired'].includes(current.status);
  let accessUntil = null;
  let newStatus;
  if (alreadyEnded) {
    newStatus = 'cancelled';
  } else if (cancelNow) {
    await stripe.subscriptions.cancel(subscriptionId);
    newStatus = 'cancelled';
  } else {
    const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    accessUntil = updated.items?.data?.[0]?.current_period_end ?? updated.current_period_end ?? null;
    newStatus = 'pending_cancel';
  }

  if (setting) {
    const data = parseSettingData(setting);
    const keep = accessUntil ? { renewaldate: new Date(accessUntil * 1000).toISOString() } : {};
    await updateUserSettingStatus(setting, newStatus, JSON.stringify({ ...data, ...keep, status: newStatus }));
  }
  // A paid-up member keeps access until the period they paid for ends.
  if (userId && newStatus !== 'pending_cancel') await updateUserClassification(userId, 'noncurrent', 'lapsed');

  const method = alreadyEnded ? 'stripe_already_cancelled'
    : trial ? 'stripe_trial' : (immediate || cancelNow ? 'stripe_immediate' : 'stripe_period_end');
  logger.info('admin.cancel_subscription', {
    userId, email, method, stripeSubscriptionId: subscriptionId, accessUntil,
    adminEmail: actor.adminEmail, adminId: actor.adminId, ...(actor.source ? { source: actor.source } : {}),
  });
  const untilLabel = accessUntil ? ` — access until ${new Date(accessUntil * 1000).toISOString()}` : ' — access ends immediately';
  await createAdminActionCase({
    userId,
    title: 'Subscription cancelled by support',
    detail: `Cancelled Stripe subscription ${subscriptionId} (${method})${untilLabel}.`,
    adminUserId: actor.adminId,
  });
  return { subscriptionId, method, status: newStatus, cancelAtPeriodEnd: newStatus === 'pending_cancel', accessUntil, previousStatus: current.status };
}

export class RefundError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

// Refund a Stripe charge (full remaining, or `amountCents`). The charge must belong to one of
// `allowedCustomerIds`; a disputed charge is refused (Stripe already pulled the money back via
// the dispute — refunding too would pay the member twice). Logs `admin.refund` + case note.
export async function refundStripeCharge({ chargeId, amountCents, reason, allowedCustomerIds = [], userId, email, actor = {} }) {
  const charge = await stripe.charges.retrieve(chargeId);
  if (!allowedCustomerIds.includes(charge.customer)) throw new RefundError('Charge does not belong to this user.', 403);
  if (charge.disputed) throw new RefundError('This charge is disputed — handle it in the Stripe dispute, not a refund.', 400);
  if (charge.status !== 'succeeded') throw new RefundError(`Charge status is ${charge.status}, not refundable.`, 400);

  const refundable = charge.amount - charge.amount_refunded;
  if (refundable <= 0) throw new RefundError('This charge is already fully refunded.', 400);

  let amount; // omit for full remaining refund
  if (amountCents != null) {
    amount = Math.round(Number(amountCents));
    if (!Number.isFinite(amount) || amount <= 0) throw new RefundError('Invalid refund amount.', 400);
    if (amount > refundable) throw new RefundError(`Amount exceeds refundable balance (${refundable}).`, 400);
  }

  const refund = await stripe.refunds.create({
    charge: chargeId,
    ...(amount != null ? { amount } : {}),
    metadata: { adminEmail: actor.adminEmail ?? '', adminId: actor.adminId ?? '', userId: userId ?? '', note: reason ?? '', source: actor.source ?? '' },
  });

  const refundedAmount = amount ?? refundable;
  logger.info('admin.refund', {
    userId, email, chargeId, amount: refundedAmount, currency: charge.currency, reason: reason ?? null,
    refundId: refund.id, adminEmail: actor.adminEmail, adminId: actor.adminId, ...(actor.source ? { source: actor.source } : {}),
  });
  const refundLabel = `${(refundedAmount / 100).toFixed(2)} ${String(charge.currency ?? '').toUpperCase()}`.trim();
  await createAdminActionCase({
    userId,
    title: 'Refund issued',
    detail: `Refunded ${refundLabel} on charge ${chargeId} (refund ${refund.id})${reason ? ` — ${reason}` : ''}.`,
    adminUserId: actor.adminId,
  });
  return { refundId: refund.id, chargeId, amount: refundedAmount, currency: charge.currency };
}
