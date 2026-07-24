import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getUserWithId, queryUserSetting } from '@/lib/userSettings';
import { stripe } from '@/lib/stripeServerFunction';
import { db } from '@/Drizzle/index.ts';
import { user_setting } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { createAdminActionCase } from '@/lib/adminSubscription';

const EXTEND_DAYS = 30;

export async function POST(request, { params }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await getUserWithId(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const setting = await queryUserSetting(id, 'subscription');
  if (!setting) return NextResponse.json({ error: 'No subscription record found' }, { status: 404 });

  // ── Stripe path ───────────────────────────────────────────────────────────
  if (setting.stripeSubscriptionId) {
    const sub = await stripe.subscriptions.retrieve(setting.stripeSubscriptionId);

    // Extend from the later of: current period end or right now
    const base = Math.max(sub.current_period_end, Math.floor(Date.now() / 1000));
    const newTrialEnd = base + EXTEND_DAYS * 24 * 60 * 60;

    await stripe.subscriptions.update(setting.stripeSubscriptionId, {
      trial_end: newTrialEnd,
      proration_behavior: 'none',
    });

    const newPeriodEnd = new Date(newTrialEnd * 1000).toISOString();

    logger.info('admin.extend_subscription', {
      userId: id,
      email: user.email,
      method: 'stripe',
      days: EXTEND_DAYS,
      stripeSubscriptionId: setting.stripeSubscriptionId,
      newPeriodEnd,
      adminEmail: admin?.email,
      adminId: admin?.id,
    });

    // Auto-log a support case for this admin action (going-forward hook).
    await createAdminActionCase({
      userId: id,
      title: 'Access extended',
      detail: `Extended access by ${EXTEND_DAYS} days (Stripe), through ${newPeriodEnd}.`,
      adminUserId: admin?.id,
    });

    return NextResponse.json({ ok: true, method: 'stripe', newPeriodEnd });
  }

  // ── Legacy DB path ────────────────────────────────────────────────────────
  // Parse stored renewaldate from the data JSON blob
  let data = setting.data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { data = {}; }
  }
  data = data ?? {};

  const currentRenewal = data.renewaldate && data.renewaldate !== 'N/A'
    ? new Date(data.renewaldate)
    : null;

  // Extend from today if renewal date is missing or already past
  const base = (currentRenewal && currentRenewal > new Date()) ? currentRenewal : new Date();
  base.setDate(base.getDate() + EXTEND_DAYS);
  data.renewaldate = base.toISOString();

  await db.update(user_setting)
    .set({ data })
    .where(eq(user_setting.id, setting.id));

  logger.info('admin.extend_subscription', {
    userId: id,
    email: user.email,
    method: 'db',
    days: EXTEND_DAYS,
    newRenewalDate: data.renewaldate,
    adminEmail: admin?.email,
    adminId: admin?.id,
  });

  // Auto-log a support case for this admin action (going-forward hook).
  await createAdminActionCase({
    userId: id,
    title: 'Access extended',
    detail: `Extended access by ${EXTEND_DAYS} days, through ${data.renewaldate}.`,
    adminUserId: admin?.id,
  });

  return NextResponse.json({ ok: true, method: 'db', newRenewalDate: data.renewaldate });
}
