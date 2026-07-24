import { NextResponse } from 'next/server';
import { getOrCreateStripeCustomer, createSetupIntent } from '@/lib/stripeServerFunction';
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
        const { userId } = await request.json();
        if (!userId) {
            return NextResponse.json({ error: 'userId required.' }, { status: 400, headers: CORS });
        }

        const user = await getUserWithId(userId);
        if (!user) {
            return NextResponse.json({ error: 'Account not found.' }, { status: 404, headers: CORS });
        }

        const { id: customerId } = await getOrCreateStripeCustomer({
            email: user.email,
            userId: user.id,
            name: user.name,
        });

        // Persist the Stripe customer id to the column so future charges/renewals reuse it.
        await updateUserSettingPaymentMethod(user.id, { stripeCustomerId: customerId });

        const setupIntent = await createSetupIntent({ customerId });

        logger.info('payment_method.setup_intent', { userId: user.id, email: user.email, customerId });

        return NextResponse.json(
            { clientSecret: setupIntent.client_secret, customerId },
            { headers: CORS },
        );
    } catch (error) {
        logger.error('payment_method.setup_intent_failed', { error });
        return NextResponse.json(
            { error: error?.message ?? 'Failed to create setup intent.' },
            { status: 500, headers: CORS },
        );
    }
}
