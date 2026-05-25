import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripeServerFunction';
import { getUserSettingByStripeSubscriptionId, updateUserSettingStatus } from '@/lib/userSettings';
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

        if (!userSetting.trial) {
            return NextResponse.json({ success: false, message: 'Only trial subscriptions can be cancelled here.' }, { status: 400, headers: CORS });
        }

        await stripe.subscriptions.cancel(subscriptionId);

        const currentData = JSON.parse(userSetting.data ?? '{}');
        await updateUserSettingStatus(userSetting, 'cancelled', JSON.stringify({
            ...currentData,
            status: 'cancelled',
        }));

        logger.info('cancellation.trial_cancel', { subscriptionId, userId: userSetting.userId });

        return NextResponse.json({ success: true }, { headers: CORS });
    } catch (error) {
        logger.error('cancellation.trial_cancel_failed', { subscriptionId, error });
        return NextResponse.json({ success: false, message: error?.message ?? 'Cancellation failed.' }, { status: 500, headers: CORS });
    }
}
