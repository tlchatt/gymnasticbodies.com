import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getUserWithId, queryUserSetting } from '@/lib/userSettings';
import { logger } from '@/lib/logger';
import { refundStripeCharge, RefundError } from '@/lib/adminSubscription';

// Issues a Stripe refund against a specific charge that belongs to this user.
// Full or partial. Auth.net / non-Stripe users have no refundable charges here
// (handled in the portal) — "support only what we can" per uniform admin flow.
export async function POST(request, { params }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { chargeId, amountCents, reason } = body;

  if (!chargeId) {
    return NextResponse.json({ error: 'chargeId required' }, { status: 400 });
  }

  const user = await getUserWithId(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const setting = await queryUserSetting(id, 'subscription');
  const customerId = setting?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: 'This user has no Stripe payments to refund.' }, { status: 400 });
  }

  try {
    // Shared core (also used by the support agent's executor): verifies the charge is this
    // user's, refuses disputed / already-refunded charges, refunds, logs, notes the case.
    const r = await refundStripeCharge({
      chargeId, amountCents, reason, allowedCustomerIds: [customerId],
      userId: id, email: user.email, actor: { adminEmail: admin?.email, adminId: admin?.id },
    });
    return NextResponse.json({ ok: true, refundId: r.refundId, amount: r.amount, currency: r.currency });
  } catch (err) {
    if (err instanceof RefundError) return NextResponse.json({ error: err.message }, { status: err.status });
    logger.error('admin.refund_failed', { userId: id, chargeId, error: err?.message });
    return NextResponse.json({ error: err?.message ?? 'Refund failed' }, { status: 500 });
  }
}
