import { db } from '@/Drizzle/index.ts';
import { app_logs } from '@/Drizzle/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { stripe } from '@/lib/stripeServerFunction';

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

  return {
    accessSource,
    isStripe,
    isAuthNet,
    productName: data.productName ?? null,
    price: data.price ?? null,
    term: data.term ?? null,
    paymentMethod: data.payment_method ?? null,
    startDate: data.startdate ?? null,
    renewalDate: data.renewaldate ?? null,
    settingStatus: setting.status ?? data.status ?? null,
    stripeLive,
    offerConversion,
  };
}
