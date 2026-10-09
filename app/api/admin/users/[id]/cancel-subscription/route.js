import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import {
  getUserWithId,
  queryUserSetting,
  updateUserSettingStatus,
  updateUserClassification,
} from '@/lib/userSettings';
import { logger } from '@/lib/logger';
import { createAdminActionCase, cancelStripeSubscription } from '@/lib/adminSubscription';

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
      // Shared core (also used by the support agent's executor): retrieve first — an already-
      // ended sub is just recorded (Stripe answers a re-cancel with resource_missing, which is
      // what the three 2026-09-28 admin cancel failures were); else cancel now / at period end.
      const r = await cancelStripeSubscription({
        userId: id, email: user.email, setting,
        subscriptionId: setting.stripeSubscriptionId,
        cancelNow: immediate || setting.trial, trial: !!setting.trial, immediate,
        actor: { adminEmail: admin?.email, adminId: admin?.id },
      });
      return NextResponse.json({ ok: true, method: r.method, cancelAtPeriodEnd: r.cancelAtPeriodEnd, accessUntil: r.accessUntil });
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
