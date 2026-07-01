import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripeServerFunction';
import { getUserSettingByStripeSubscriptionId, updateUserSettingStatus, updateUserClassification } from '@/lib/userSettings';
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
    let subscriptionId;
    try {
        ({ subscriptionId } = await request.json());
        if (!subscriptionId) {
            return NextResponse.json({ success: false, message: 'subscriptionId required.' }, { status: 400, headers: CORS });
        }

        const userSetting = await getUserSettingByStripeSubscriptionId(subscriptionId);
        if (!userSetting) {
            return NextResponse.json({ success: false, message: 'Subscription not found.' }, { status: 404, headers: CORS });
        }

        const currentData = JSON.parse(userSetting.data ?? '{}');

        if (userSetting.trial) {
            // Trial: cancel immediately
            await stripe.subscriptions.cancel(subscriptionId);
            await updateUserSettingStatus(userSetting, 'cancelled', JSON.stringify({ ...currentData, status: 'cancelled' }));
            await updateUserClassification(userSetting.userId, 'noncurrent', 'lapsed');
            logger.info('cancellation.trial_cancel', { subscriptionId, userId: userSetting.userId });
            return NextResponse.json({ success: true, cancelAtPeriodEnd: false }, { headers: CORS });
        }

        // Active subscription: cancel at period end so user keeps access until billing date
        const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
        const accessUntil = updated.current_period_end; // unix timestamp

        await updateUserSettingStatus(
            userSetting,
            'pending_cancel',
            JSON.stringify({ ...currentData, status: 'pending_cancel' })
        );
        await updateUserClassification(userSetting.userId, 'noncurrent', 'lapsed');

        logger.info('cancellation.active_cancel', { subscriptionId, userId: userSetting.userId, accessUntil });

        return NextResponse.json({ success: true, cancelAtPeriodEnd: true, accessUntil }, { headers: CORS });
    } catch (error) {
        logger.error('cancellation.failed', { subscriptionId, error: error?.message });
        return NextResponse.json({ success: false, message: error?.message ?? 'Cancellation failed.' }, { status: 500, headers: CORS });
    }
}
