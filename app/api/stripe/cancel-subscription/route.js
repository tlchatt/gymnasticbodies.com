import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripeServerFunction';
import { getUserSettingByStripeSubscriptionId, updateUserSettingStatus, updateUserClassification } from '@/lib/userSettings';
import { logger } from '@/lib/logger';
import { getSessionUserId } from '@/lib/sessionUser';
import { notifySubscriptionCancelled } from '@/lib/cancellationNotice';

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
        // Only the signed-in member can cancel, and only their own subscription.
        const sessionUserId = await getSessionUserId(request);
        if (!sessionUserId) {
            return NextResponse.json({ success: false, message: 'Your sign-in has expired. Please sign in again.' }, { status: 401, headers: CORS });
        }

        ({ subscriptionId } = await request.json());
        if (!subscriptionId) {
            return NextResponse.json({ success: false, message: 'subscriptionId required.' }, { status: 400, headers: CORS });
        }

        const userSetting = await getUserSettingByStripeSubscriptionId(subscriptionId);
        if (!userSetting || userSetting.userId !== sessionUserId) {
            if (userSetting) logger.warn('cancellation.not_owner', { userId: sessionUserId, subscriptionId });
            return NextResponse.json({ success: false, message: 'Subscription not found.' }, { status: 404, headers: CORS });
        }

        const currentData = JSON.parse(userSetting.data ?? '{}');

        if (userSetting.trial) {
            // Trial: cancel immediately
            await stripe.subscriptions.cancel(subscriptionId);
            await updateUserSettingStatus(userSetting, 'cancelled', JSON.stringify({ ...currentData, status: 'cancelled' }));
            await updateUserClassification(userSetting.userId, 'noncurrent', 'lapsed');
            logger.info('cancellation.trial_cancel', { subscriptionId, userId: userSetting.userId });
            await notifySubscriptionCancelled({ subscriptionId, userId: userSetting.userId, source: 'member' });
            return NextResponse.json({ success: true, cancelAtPeriodEnd: false }, { headers: CORS });
        }

        // Active subscription: cancel at period end so user keeps access until billing date
        const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
        const accessUntil = updated.items?.data?.[0]?.current_period_end ?? updated.current_period_end; // unix timestamp

        // The member stays current until the paid period ends; the subscription.deleted webhook
        // (and the daily classifier) lapse them then.
        await updateUserSettingStatus(
            userSetting,
            'pending_cancel',
            JSON.stringify({ ...currentData, status: 'pending_cancel', ...(accessUntil ? { renewaldate: new Date(accessUntil * 1000).toISOString() } : {}) })
        );

        logger.info('cancellation.active_cancel', { subscriptionId, userId: userSetting.userId, accessUntil });
        await notifySubscriptionCancelled({ subscriptionId, userId: userSetting.userId, accessUntil, source: 'member' });

        return NextResponse.json({ success: true, cancelAtPeriodEnd: true, accessUntil }, { headers: CORS });
    } catch (error) {
        logger.error('cancellation.failed', { subscriptionId, error: error?.message });
        return NextResponse.json({ success: false, message: error?.message ?? 'Cancellation failed.' }, { status: 500, headers: CORS });
    }
}
