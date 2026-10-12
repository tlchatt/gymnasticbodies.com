import { NextResponse } from 'next/server';
import { createStripeCustomer, attachPaymentMethod, createStripeSubscriptionWithPriceData, deleteStripeCustomer, findActiveStripeSubByEmail, blockedPaymentReason, BLOCKED_PAYMENT_MESSAGE, isPaidSubscription, cancelUnpaidSubscription, retrieveConfirmedSubscription } from '@/lib/stripeServerFunction';
import { getUserWithEmail, queryUserSetting, updateUserSettingRenewal, updateUserClassification } from '@/lib/userSettings';
import { createMemberSession } from '@/lib/sessionUser';
import { logger } from '@/lib/logger';
import { getOffer } from '@/lib/pricing';

function getStripeInterval(term) {
    const t = term?.toLowerCase();
    if (t === 'annually' || t === 'annual' || t === 'yearly' || t === 'year') {
        return { interval: 'year', intervalCount: 1 };
    }
    if (t === 'quarterly' || t === 'quarter') {
        return { interval: 'month', intervalCount: 3 };
    }
    return { interval: 'month', intervalCount: 1 };
}

// The payment is complete: record it on the member and sign them in. This is the ONLY place
// this route issues a session (owner rule 2026-10-12: no sign-in on a payment page until the
// transaction is complete) — never for an email alone, never for an unpaid subscription.
async function completeOffer({ user, setting, currentData, customerId, subscription, offer, slug }) {
    const periodEnd = subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
    const renewaldate = new Date(periodEnd * 1000).toISOString();

    await updateUserSettingRenewal(setting, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        status: 'active',
        data: JSON.stringify({
            ...currentData,
            status: 'active',
            renewaldate,
            price: offer.amount,
            term: offer.term,
        }),
    }, user.id);

    await updateUserClassification(user.id, 'current', 'stripe');

    const token = await createMemberSession(user.id);

    logger.info('offer.success', {
        email: user.email,
        slug,
        price: offer.amount,
        term: offer.term,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        userId: user.id,
    });

    return NextResponse.json({
        success: true,
        token,
        userId: user.id,
        email: user.email,
        name: user.name,
    });
}

export async function POST(request) {
    let newCustomerId = null;
    let createdSubscriptionId = null;
    let email;
    try {
        let paymentMethodId, slug, subscriptionId;
        ({ paymentMethodId, email, slug, subscriptionId } = await request.json());

        const offer = await getOffer(slug);
        if (!offer || offer.active === false) {
            return NextResponse.json({ success: false, message: 'Offer not found.' }, { status: 404 });
        }

        logger.info('offer.attempt', { email, slug, price: offer.amount, term: offer.term, data: subscriptionId ? { confirm: subscriptionId } : undefined });

        const user = await getUserWithEmail(email);
        if (!user) return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });

        const setting = await queryUserSetting(user.id, 'subscription');
        const currentData = JSON.parse(setting?.data ?? '{}');

        const amountCents = Math.round(parseFloat(offer.amount) * 100);
        const { interval, intervalCount } = getStripeInterval(offer.term);

        // Second step after 3D Secure: the browser confirmed the payment with Stripe. Finish only
        // if Stripe says that subscription is paid and belongs to this member.
        if (subscriptionId) {
            const confirmed = await retrieveConfirmedSubscription(subscriptionId, { email, customerId: setting?.stripeCustomerId });
            if (!confirmed) {
                logger.warn('offer.confirm_rejected', { email, slug, data: { subscriptionId } });
                return NextResponse.json({ success: false, message: 'We could not confirm that payment. If you were charged, contact support@gymnasticbodies.com.' }, { status: 402 });
            }
            return completeOffer({ user, setting, currentData, customerId: confirmed.customer.id, subscription: confirmed, offer, slug });
        }

        // Already subscribed: nothing to buy, and no sign-in — they sign in on my. like anyone else.
        if (setting?.stripeSubscriptionId && user.customerSegment === 'stripe') {
            logger.info('offer.already_active', { email, slug, stripeSubscriptionId: setting.stripeSubscriptionId });
            return NextResponse.json({
                success: false,
                alreadyActive: true,
                message: 'You already have an active membership — please sign in at my.gymnasticbodies.com.',
            }, { status: 409 });
        }

        // Live-Stripe duplicate guard. The check above only sees a subscription id Neon
        // happens to have stored, which misses any sub living on a second Stripe customer
        // or one that was never linked back — the gap that gave 13 members parallel
        // subscriptions and $1,475 in refunds. create-subscription and renew-subscription
        // got this guard in 208c74a; this route did not, and it is the one an offer
        // campaign points thousands of legacy members at.
        // Banned member (card or email on the Stripe block list) — refuse before anything is created.
        const blocked = await blockedPaymentReason({ paymentMethodId, email });
        if (blocked) {
            logger.warn('offer.blocked_payment', { email, data: { blocked } });
            return NextResponse.json({ success: false, message: BLOCKED_PAYMENT_MESSAGE }, { status: 403 });
        }

        const liveSub = await findActiveStripeSubByEmail(email);
        if (liveSub) {
            logger.warn('offer.duplicate_stripe', { email, slug, data: { existingSubscription: liveSub.id, status: liveSub.status } });
            return NextResponse.json({
                success: false,
                existingCustomer: true,
                message: 'This email already has an active membership. Please sign in, or contact support@gymnasticbodies.com if you think this is wrong.',
            }, { status: 409 });
        }

        let customerId = setting?.stripeCustomerId ?? null;
        if (!customerId) {
            const customer = await createStripeCustomer(email, user.name, currentData.phone ?? null, currentData.country ?? null);
            customerId = customer.id;
            newCustomerId = customerId;
        }

        await attachPaymentMethod(paymentMethodId, customerId);

        const subscription = await createStripeSubscriptionWithPriceData(customerId, {
            amountCents,
            currency: 'usd',
            interval,
            intervalCount,
        });
        createdSubscriptionId = subscription?.id ?? null;

        // Handle 3DS — the browser confirms, then calls back with subscriptionId
        const paymentIntent = subscription?.latest_invoice?.payment_intent;
        if (paymentIntent?.status === 'requires_action') {
            logger.info('offer.3ds_required', { email, slug, subscriptionId: subscription.id });
            return NextResponse.json({
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                subscriptionId: subscription.id,
            });
        }

        // Declined (Stripe returns an 'incomplete' subscription rather than throwing): cancel it,
        // record nothing, sign no one in.
        if (!isPaidSubscription(subscription)) {
            await cancelUnpaidSubscription(subscription.id);
            logger.warn('offer.payment_declined', { email, slug, data: { subscriptionId: subscription.id, status: subscription.status, paymentIntentStatus: paymentIntent?.status } });
            return NextResponse.json({
                success: false,
                message: paymentIntent?.last_payment_error?.message ?? 'Your card was declined. Please try another card.',
            }, { status: 402 });
        }

        return await completeOffer({ user, setting, currentData, customerId, subscription, offer, slug });
    } catch (error) {
        logger.error('offer.failed', { email, error: error?.message });
        // Only roll back the new customer when no subscription was created. Once a subscription
        // exists the card may already be charged; deleting the customer cancels the subscription but
        // keeps the money, leaving a paying member paywalled. Log it loudly for manual repair instead.
        if (createdSubscriptionId) {
            logger.error('offer.failed_after_subscription', { email, data: { stripeCustomerId: newCustomerId, stripeSubscriptionId: createdSubscriptionId, error: error?.message } });
        } else if (newCustomerId) {
            try { await deleteStripeCustomer(newCustomerId); } catch (_) {}
        }
        return NextResponse.json({ success: false, message: error?.message ?? 'Subscription failed. Please try again.' }, { status: 500 });
    }
}

export async function GET() {
    return new Response('OK', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
