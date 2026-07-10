import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { queryUserSetting } from '@/lib/userSettings';
import { stripe } from '@/lib/stripeServerFunction';
import { logger } from '@/lib/logger';

// Lists a user's recent Stripe charges so an admin can pick one to refund.
// Returns an empty list (not an error) for users with no Stripe customer —
// the refund UI is uniform for everyone and simply shows "nothing refundable".
export async function GET(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const setting = await queryUserSetting(id, 'subscription');
  const customerId = setting?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ charges: [], hasCustomer: false });
  }

  try {
    const list = await stripe.charges.list({ customer: customerId, limit: 10 });
    const charges = list.data.map((c) => ({
      id: c.id,
      amount: c.amount,
      amountRefunded: c.amount_refunded,
      refundable: c.amount - c.amount_refunded,
      currency: c.currency,
      created: c.created,
      status: c.status,
      paid: c.paid,
      refunded: c.refunded,
      description: c.description || c.calculated_statement_descriptor || null,
    }));
    return NextResponse.json({ charges, hasCustomer: true });
  } catch (err) {
    logger.error('admin.charges_list_failed', { userId: id, error: err?.message });
    return NextResponse.json({ error: err?.message ?? 'Failed to load charges' }, { status: 500 });
  }
}
