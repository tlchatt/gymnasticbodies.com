import { NextResponse } from 'next/server';
import { createStripeCustomer, attachPaymentMethod, createStripeSubscriptionWithPriceData, deleteStripeCustomer } from '@/lib/stripeServerFunction';
import { getUserWithEmail, queryUserSetting, updateUserSettingRenewal, updateUserClassification } from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { session } from '@/Drizzle/db/schema';
import { randomBytes } from 'crypto';
import { logger } from '@/lib/logger';
import offers from '@/data/content/offers.json';

function generateSessionToken() {
    return randomBytes(16).toString('hex');
}

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

export async function POST(request) {
    let newCustomerId = null;
    let email;
    try {
        let paymentMethodId, slug;
        ({ paymentMethodId, email, slug } = await request.json());

        const offer = offers[slug];
        if (!offer) {
            return NextResponse.json({ success: false, message: 'Offer not found.' }, { status: 404 });
        }

        logger.info('offer.attempt', { email, slug, price: offer.price, term: offer.term });

        const user = await getUserWithEmail(email);
        if (!user) return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });

        const setting = await queryUserSetting(user.id, 'subscription');
        const currentData = JSON.parse(setting?.data ?? '{}');

        const amountCents = Math.round(parseFloat(offer.price) * 100);
        const { interval, intervalCount } = getStripeInterval(offer.term);

        if (setting?.stripeSubscriptionId && user.customerSegment === 'stripe') {
            logger.info('offer.already_active', { email, slug, stripeSubscriptionId: setting.stripeSubscriptionId });
            const token = generateSessionToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await db.insert(session).values({
                id: randomBytes(16).toString('hex'),
                token,
                userId: user.id,
                expiresAt,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            return NextResponse.json({ success: true, token, userId: user.id, email: user.email, name: user.name });
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

        const paymentIntent = subscription?.latest_invoice?.payment_intent;
        if (paymentIntent?.status === 'requires_action') {
            logger.info('offer.3ds_required', { email, slug, subscriptionId: subscription.id });
            return NextResponse.json({
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                subscriptionId: subscription.id,
            });
        }

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
                price: offer.price,
                term: offer.term,
            }),
        });

        await updateUserClassification(user.id, 'current', 'stripe');

        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.insert(session).values({
            id: randomBytes(16).toString('hex'),
            token,
            userId: user.id,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        logger.info('offer.success', {
            email: user.email,
            slug,
            price: offer.price,
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
    } catch (error) {
        logger.error('offer.failed', { email, error: error?.message });
        if (newCustomerId) {
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
