import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripeServerFunction';
import {
    getUserSettingByStripeSubscriptionId,
    updateUserSettingStatus,
    updateUserSettingData,
} from '@/lib/userSettings';
import { sendSubsCancelledEmailSG } from '@/lib/sendgrid';

export async function POST(request) {
    const sig = request.headers.get('stripe-signature');
    const body = await request.text();

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Stripe webhook signature verification failed:', err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    try {
        // invoice events have .subscription; subscription events have .id
        const subscriptionId = event.data.object.subscription ?? event.data.object.id;
        const userSetting = await getUserSettingByStripeSubscriptionId(subscriptionId);

        // Silently ack events we don't have a record for (e.g. test events)
        if (!userSetting) {
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const currentData = JSON.parse(userSetting.data ?? '{}');

        switch (event.type) {
            case 'invoice.payment_succeeded': {
                const periodEnd = new Date(event.data.object.period_end * 1000);
                await updateUserSettingData(userSetting, JSON.stringify({
                    ...currentData,
                    renewaldate: periodEnd.toISOString(),
                    status: 'active',
                }));
                break;
            }

            case 'customer.subscription.deleted': {
                // Idempotency guard — don't re-send cancellation email
                if (userSetting.status !== 'cancelled') {
                    await updateUserSettingStatus(userSetting, 'cancelled', JSON.stringify({
                        ...currentData,
                        status: 'cancelled',
                    }));
                    const email = currentData?.email;
                    if (email) await sendSubsCancelledEmailSG(email);
                }
                break;
            }

            case 'invoice.payment_failed': {
                await updateUserSettingStatus(userSetting, 'inactive', JSON.stringify({
                    ...currentData,
                    status: 'inactive',
                }));
                break;
            }

            default:
                break;
        }
    } catch (err) {
        console.error('Stripe webhook handler error:', err);
        // Still return 200 so Stripe doesn't keep retrying for internal errors
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
