import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getUserWithId, queryUserSetting } from '@/lib/userSettings';
import { stripe } from '@/lib/stripeServerFunction';
import { logger } from '@/lib/logger';

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
    // Verify the charge actually belongs to this user before refunding anything.
    const charge = await stripe.charges.retrieve(chargeId);
    if (charge.customer !== customerId) {
      return NextResponse.json({ error: 'Charge does not belong to this user.' }, { status: 403 });
    }

    const refundable = charge.amount - charge.amount_refunded;
    if (refundable <= 0) {
      return NextResponse.json({ error: 'This charge is already fully refunded.' }, { status: 400 });
    }

    let amount; // omit for full remaining refund
    if (amountCents != null) {
      amount = Math.round(Number(amountCents));
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: 'Invalid refund amount.' }, { status: 400 });
      }
      if (amount > refundable) {
        return NextResponse.json({ error: `Amount exceeds refundable balance (${refundable}).` }, { status: 400 });
      }
    }

    const refund = await stripe.refunds.create({
      charge: chargeId,
      ...(amount != null ? { amount } : {}),
      metadata: {
        adminEmail: admin?.email ?? '',
        adminId: admin?.id ?? '',
        userId: id,
        note: reason ?? '',
      },
    });

    const refundedAmount = amount ?? refundable;
    logger.info('admin.refund', {
      userId: id,
      email: user.email,
      chargeId,
      amount: refundedAmount,
      currency: charge.currency,
      reason: reason ?? null,
      refundId: refund.id,
      adminEmail: admin?.email,
      adminId: admin?.id,
    });

    return NextResponse.json({ ok: true, refundId: refund.id, amount: refundedAmount, currency: charge.currency });
  } catch (err) {
    logger.error('admin.refund_failed', { userId: id, chargeId, error: err?.message });
    return NextResponse.json({ error: err?.message ?? 'Refund failed' }, { status: 500 });
  }
}
