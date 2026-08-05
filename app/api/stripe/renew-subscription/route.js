import { NextResponse } from 'next/server';
import { createStripeCustomer, attachPaymentMethod, createStripeSubscriptionWithPriceData, deleteStripeCustomer , findActiveStripeSubByEmail } from '@/lib/stripeServerFunction';
import { getUserWithEmail, queryUserSetting, updateUserSettingRenewal, updateUserClassification } from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { session } from '@/Drizzle/db/schema';
import { randomBytes } from 'crypto';
import { logger } from '@/lib/logger';

function generateSessionToken() {
    return randomBytes(16).toString('hex'); // 32-char hex string matching better-auth format
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
        let paymentMethodId, overridePrice, overrideTerm;
        ({ paymentMethodId, email, price: overridePrice, term: overrideTerm } = await request.json());

        logger.info('renewal.attempt', { email, price: overridePrice, term: overrideTerm });

        const user = await getUserWithEmail(email);
        if (!user) return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });

        const setting = await queryUserSetting(user.id, 'subscription');
        const currentData = JSON.parse(setting?.data ?? '{}');

        // Use override from frontend if provided, otherwise fall back to DB values, then $75/month
        const rawPrice = overridePrice ?? (currentData.price && currentData.price !== 'N/A' ? currentData.price : '75');
        const rawTerm = overrideTerm ?? (currentData.term && currentData.term !== 'N/A' ? currentData.term : 'monthly');
        const amountCents = Math.round(parseFloat(rawPrice) * 100);
        const { interval, intervalCount } = getStripeInterval(rawTerm);

        // Idempotency: if already subscribed, return success without creating a duplicate
        if (setting?.stripeSubscriptionId && user.customerSegment === 'stripe') {
            logger.info('renewal.already_active', { email, stripeSubscriptionId: setting.stripeSubscriptionId });
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

        // Live-Stripe duplicate guard — the Neon idempotency check above misses subs
        // on a second customer record (or ones Neon never linked). Block instead of
        // creating a parallel billing life; support resolves the mismatch.
        const liveSub = await findActiveStripeSubByEmail(email);
        if (liveSub) {
            logger.warn('renewal.duplicate_stripe', { email, data: { existingSubscription: liveSub.id, status: liveSub.status } });
            return NextResponse.json({
                success: false,
                message: 'This email already has an active membership in our billing system. Please contact support@gymnasticbodies.com and we will sort it out — do not pay again.',
            }, { status: 409 });
        }

        // Reuse existing Stripe customer or create new one
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

        // Handle 3DS
        const paymentIntent = subscription?.latest_invoice?.payment_intent;
        if (paymentIntent?.status === 'requires_action') {
            logger.info('renewal.3ds_required', { email, subscriptionId: subscription.id });
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
                price: rawPrice,
                term: rawTerm,
            }),
        });

        await updateUserClassification(user.id, 'current', 'stripe');

        // Create a better-auth session directly — auth.api.createSession doesn't exist in v1.5.x
        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await db.insert(session).values({
            id: randomBytes(16).toString('hex'),
            token,
            userId: user.id,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        logger.info('renewal.success', {
            email: user.email,
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
        logger.error('renewal.failed', { email, error });
        if (newCustomerId) {
            try { await deleteStripeCustomer(newCustomerId); } catch (_) {}
        }
        return NextResponse.json({ success: false, message: error?.message ?? 'Renewal failed. Please try again.' }, { status: 500 });
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
