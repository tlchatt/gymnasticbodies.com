import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import {
  getUserWithId,
  queryUserSetting,
  updateUserSettingStatus,
  updateUserClassification,
} from '@/lib/userSettings';
import { stripe } from '@/lib/stripeServerFunction';
import { logger } from '@/lib/logger';
import { createAdminActionCase } from '@/lib/adminSubscription';

// Admin cancel. Uniform flow for every user; does only what the user's
// gateway supports:
//   - Stripe sub  → cancels in Stripe (period-end by default, or immediate)
//   - No Stripe   → app-level cancel only (marks noncurrent/lapsed, logs it);
//                   stop real billing (e.g. Auth.net) in that gateway's portal.
export async function POST(request, { params }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const immediate = body.immediate === true;

  const user = await getUserWithId(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const setting = await queryUserSetting(id, 'subscription');

  let data = {};
  if (setting?.data) {
    try { data = typeof setting.data === 'string' ? JSON.parse(setting.data) : (setting.data ?? {}); }
    catch { data = {}; }
  }

  // ── Stripe path ────────────────────────────────────────────────────────────
  if (setting?.stripeSubscriptionId) {
    try {
      const cancelNow = immediate || setting.trial;
      let accessUntil = null;
      let newStatus;

      if (cancelNow) {
        await stripe.subscriptions.cancel(setting.stripeSubscriptionId);
        newStatus = 'cancelled';
      } else {
        const updated = await stripe.subscriptions.update(setting.stripeSubscriptionId, { cancel_at_period_end: true });
        accessUntil = updated.current_period_end;
        newStatus = 'pending_cancel';
      }

      await updateUserSettingStatus(setting, newStatus, JSON.stringify({ ...data, status: newStatus }));
      await updateUserClassification(id, 'noncurrent', 'lapsed');

      const method = setting.trial ? 'stripe_trial' : (immediate ? 'stripe_immediate' : 'stripe_period_end');
      logger.info('admin.cancel_subscription', {
        userId: id, email: user.email, method,
        stripeSubscriptionId: setting.stripeSubscriptionId,
        accessUntil, adminEmail: admin?.email, adminId: admin?.id,
      });

      // Auto-log a support case for this admin action (going-forward hook).
      const untilLabel = accessUntil ? ` — access until ${new Date(accessUntil * 1000).toISOString()}` : ' — access ends immediately';
      await createAdminActionCase({
        userId: id,
        title: 'Subscription cancelled by support',
        detail: `Cancelled Stripe subscription ${setting.stripeSubscriptionId} (${method})${untilLabel}.`,
        adminUserId: admin?.id,
      });

      return NextResponse.json({ ok: true, method, cancelAtPeriodEnd: newStatus === 'pending_cancel', accessUntil });
    } catch (err) {
      logger.error('admin.cancel_subscription_failed', { userId: id, error: err?.message });
      return NextResponse.json({ error: err?.message ?? 'Cancel failed' }, { status: 500 });
    }
  }

  // ── App-level path (non-Stripe / Auth.net / no gateway) ─────────────────────
  // We can't touch an external gateway from here — revoke app access + record it.
  if (setting) {
    await updateUserSettingStatus(setting, 'cancelled', JSON.stringify({ ...data, status: 'cancelled' }));
  }
  await updateUserClassification(id, 'noncurrent', 'lapsed');

  logger.info('admin.cancel_subscription', {
    userId: id, email: user.email, method: 'app',
    note: 'App-level cancel only — stop real billing in the payment gateway portal if applicable.',
    adminEmail: admin?.email, adminId: admin?.id,
  });

  // Auto-log a support case for this admin action (going-forward hook).
  await createAdminActionCase({
    userId: id,
    title: 'Subscription cancelled by support',
    detail: 'App-level cancel — access revoked (noncurrent/lapsed). Stop real billing in the payment gateway portal if applicable.',
    adminUserId: admin?.id,
  });

  return NextResponse.json({ ok: true, method: 'app', cancelAtPeriodEnd: false, accessUntil: null });
}
