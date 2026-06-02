import { NextResponse } from 'next/server';
import { createStripeCustomer, attachPaymentMethod, createStripeSubscription, deleteStripeCustomer, stripe } from '@/lib/stripeServerFunction';
import { createAndModifyUserInNeon, getUserWithEmail, queryUserSetting } from '@/lib/userSettings';
import { sendCredentialsEmailSG } from '@/lib/sendgrid';
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

        const trialDays = (trial === 'true' || trial === true) ? 7 : 0;
        const priceId = process.env.STRIPE_PRICE_ID;

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
            matchedTerm: term ?? 'monthly',
            price: amount ?? '75',
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
