import { db } from '@/Drizzle/index.ts';
import { app_logs, support_cases, user } from '@/Drizzle/db/schema';
import { and, eq, desc, inArray } from 'drizzle-orm';
import { stripe } from '@/lib/stripeServerFunction';
import { isSubscriptionActive, subscriptionStatusLabel, cleanPlanName } from '@/lib/subscription';
import { logger } from '@/lib/logger';

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
