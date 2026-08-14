import { NextResponse } from 'next/server';
import { createStripeCustomer, attachPaymentMethod, createStripeSubscription, deleteStripeCustomer, findActiveStripeSubByEmail, stripe } from '@/lib/stripeServerFunction';
import { createAndModifyUserInNeon, getUserWithEmail, queryUserSetting } from '@/lib/userSettings';
import { sendCredentialsEmailSG } from '@/lib/sendgrid';
import { getSubscribePricing } from '@/lib/pricing';
import { logger } from '@/lib/logger';

export async function POST(request) {
    let customer = null;
    try {
        const json = await request.json();
        const { paymentMethodId, email, phone, country, password, amount, term, trial } = json;

        logger.info('signup.attempt', { email, trial: trial === 'true' || trial === true, term, amount });

        // Check for existing active Stripe subscriber
        const existingUser = await getUserWithEmail(email);
        let existingCustomerId = null;
        if (existingUser) {
            const existingSetting = await queryUserSetting(existingUser.id, 'subscription');
            if (existingSetting?.stripeSubscriptionId) {
                logger.warn('signup.duplicate', { email });
                return NextResponse.json({
                    existingCustomer: true,
                    message: 'An account with this email already exists.',
                    transaction: false,
                    customerCreated: false,
                    subscriptionCreated: false,
                });
            }
            // Reuse existing Stripe customer if one was already created (e.g. prior failed attempt)
            if (existingSetting?.stripeCustomerId) {
                existingCustomerId = existingSetting.stripeCustomerId;
            }
        }

        // Live-Stripe duplicate guard — a second signup must never start a parallel
        // billing life on a new customer record, even when Neon has no record of the
        // first sub (that is exactly how members got double-billed).
        const liveSub = await findActiveStripeSubByEmail(email);
        if (liveSub) {
            logger.warn('signup.duplicate_stripe', { email, data: { existingSubscription: liveSub.id, status: liveSub.status } });
            return NextResponse.json({
                existingCustomer: true,
                message: 'This email already has an active membership. Please sign in, or contact support@gymnasticbodies.com if you think this is wrong.',
                transaction: false,
                customerCreated: false,
                subscriptionCreated: false,
            });
        }

        // Single source of truth — the one defined Subscribe rate + its Stripe Price. The URL
        // amount/term are ignored for billing (they always were); the config drives the charge,
        // the trial length, and the recorded price so nothing can render a stale number.
        const subscribePricing = await getSubscribePricing();
        const trialDays = (trial === 'true' || trial === true) ? (subscribePricing.trialDays ?? 7) : 0;
        const priceId = subscribePricing.stripePriceId;
        if (!priceId) {
            logger.error('signup.no_price_id', { email });
            return NextResponse.json({ message: 'Subscription is temporarily unavailable. Please contact support@gymnasticbodies.com.', transaction: false }, { status: 503 });
        }

        // Reuse existing customer or create new one (idempotency key prevents dupes on concurrent requests)
        const name = email.split('@')[0];
        if (existingCustomerId) {
            customer = await stripe.customers.retrieve(existingCustomerId);
        } else {
            customer = await stripe.customers.create(
                { email, name, phone, metadata: { country } },
                { idempotencyKey: `customer-${email}` }
            );
        }

        // Attach payment method
        await attachPaymentMethod(paymentMethodId, customer.id);

        // Create subscription with trial
        const subscription = await createStripeSubscription(customer.id, priceId, trialDays);

        // Handle 3DS (rare for trial — no immediate charge)
        const paymentIntent = subscription?.latest_invoice?.payment_intent;
        if (paymentIntent?.status === 'requires_action') {
            return NextResponse.json({
                requiresAction: true,
                clientSecret: paymentIntent.client_secret,
                subscriptionId: subscription.id,
            });
        }

        const impInfo = {
            status: 'Active',
            firstName: name,
            lastName: 'N/A',
            nextPaymentDate: new Date(Date.now() + (trialDays + 30) * 24 * 60 * 60 * 1000),
            oldestTransactionDate: new Date(),
            matchedTerm: subscribePricing.term ?? 'monthly',
            price: String(subscribePricing.amount),
            phone: phone ?? 'N/A',
            country: country ?? 'N/A',
            AuthorizeNextImport: false,
            authorizenetCustomerId: null,
        };

        const stripeData = {
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
        };

        const dbUser = await createAndModifyUserInNeon(
            { email, password, phone, country, trial: trialDays > 0 },
            impInfo,
            { data: { profile: 'N/A', subscriptionId: 'N/A' } },
            stripeData
        );

        await sendCredentialsEmailSG({ email, password });

        logger.info('signup.success', {
            email,
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id,
            userId: dbUser?.user?.id,
        });

        return NextResponse.json({
            message: 'Subscription Created Successfully',
            existingCustomer: false,
            transaction: true,
            customerCreated: true,
            subscriptionCreated: true,
            data: JSON.stringify({
                email,
                userInNeon: dbUser,
                token: dbUser?.token,
                impInfo,
                firstName: impInfo.firstName,
                lastName: impInfo.lastName,
            }),
        });
    } catch (error) {
        logger.error('signup.failed', { email: json?.email, error });
        if (customer?.id) {
            try { await deleteStripeCustomer(customer.id); } catch (_) {}
        }
        return NextResponse.json({
            message: error?.message ?? 'Subscription creation failed. Please try again.',
            transaction: false,
            customerCreated: false,
            subscriptionCreated: false,
            error: error?.message,
        }, { status: 500 });
    }
}

export async function GET() {
    return new Response('OK', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
