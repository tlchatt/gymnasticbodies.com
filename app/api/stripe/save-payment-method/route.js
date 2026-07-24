import { NextResponse } from 'next/server';
import { stripe, getOrCreateStripeCustomer, attachPaymentMethod } from '@/lib/stripeServerFunction';
import { getUserWithId, updateUserSettingPaymentMethod } from '@/lib/userSettings';
import { logger } from '@/lib/logger';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
    try {
        const { userId, paymentMethodId } = await request.json();
        if (!userId || !paymentMethodId) {
            return NextResponse.json({ error: 'userId and paymentMethodId are required.' }, { status: 400, headers: CORS });
        }

        const user = await getUserWithId(userId);
        if (!user) {
            return NextResponse.json({ error: 'Account not found.' }, { status: 404, headers: CORS });
        }

        // Derive the customer from the PaymentMethod itself — confirmCardSetup on the
        // SetupIntent already attached it to the setup-intent's customer. Re-running
        // getOrCreateStripeCustomer here can race and resolve a DIFFERENT customer,
        // making the attach fail cross-customer.
        const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
        const cardBrand = pm?.card?.brand ?? null;
        const cardLast4 = pm?.card?.last4 ?? null;

        let customerId = typeof pm?.customer === 'string' ? pm.customer : pm?.customer?.id ?? null;
        if (customerId) {
            // Already attached — just make it the customer's default payment method.
            await stripe.customers.update(customerId, {
                invoice_settings: { default_payment_method: paymentMethodId },
            });
        } else {
            // Not attached (unexpected) — fall back to the stored customer and attach.
            const { id } = await getOrCreateStripeCustomer({
                email: user.email,
                userId: user.id,
                name: user.name,
            });
            customerId = id;
            await attachPaymentMethod(paymentMethodId, customerId);
        }

        // Persist card meta in data JSON + stripe_customer_id column.
        // NEVER writes stripe_subscription_id — keeps the classifier from treating a
        // saved card as an active Stripe subscription.
        const persisted = await updateUserSettingPaymentMethod(user.id, {
            stripeCustomerId: customerId,
            paymentMethodId,
            cardBrand,
            cardLast4,
        });

        // updateUserSettingPaymentMethod returns null when the user has no
        // type='subscription' row — the card is attached in Stripe but NOT saved on
        // the account. Fail loudly rather than reporting a save that didn't happen.
        if (!persisted) {
            logger.error('payment_method.save_not_persisted', { userId: user.id, email: user.email, customerId });
            return NextResponse.json(
                { ok: false, error: 'Your card could not be saved to your account. Please contact support.' },
                { status: 500, headers: CORS },
            );
        }

        logger.info('payment_method.saved', { userId: user.id, email: user.email, customerId, cardBrand, cardLast4 });

        return NextResponse.json({ ok: true, success: true, cardBrand, cardLast4 }, { headers: CORS });
    } catch (error) {
        logger.error('payment_method.save_failed', { error });
        return NextResponse.json(
            { ok: false, error: error?.message ?? 'Failed to save payment method.' },
            { status: 500, headers: CORS },
        );
    }
}
