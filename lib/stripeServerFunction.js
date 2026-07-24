import Stripe from 'stripe';
import { db } from '@/Drizzle/index.ts';
import { user_setting } from '@/Drizzle/db/schema';
import { eq, and } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createStripeCustomer(email, name, phone, country) {
    return stripe.customers.create({ email, name, phone, metadata: { country } });
}

// Reuse an existing Stripe customer stored on the user's subscription setting,
// otherwise create a new one. Returns { id, created }.
export async function getOrCreateStripeCustomer({ email, userId, name }) {
    if (userId) {
        const rows = await db.select().from(user_setting)
            .where(and(eq(user_setting.userId, userId), eq(user_setting.type, 'subscription')));
        const existing = rows.find(r => r.stripeCustomerId);
        if (existing?.stripeCustomerId) {
            return { id: existing.stripeCustomerId, created: false };
        }
    }
    const customer = await createStripeCustomer(email, name);
    return { id: customer.id, created: true };
}

// SetupIntent to collect + save a card for off-session charges (renewal at expiry).
export async function createSetupIntent({ customerId }) {
    return stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
    });
}

export async function attachPaymentMethod(paymentMethodId, customerId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
    });
}

export async function createStripeSubscription(customerId, priceId, trialDays = 7) {
    return stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent']
    });
}

export async function deleteStripeCustomer(customerId) {
    return stripe.customers.del(customerId);
}

export async function createStripeSubscriptionWithPriceData(customerId, { amountCents, currency, interval, intervalCount }) {
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
    return stripe.subscriptions.create({
        customer: customerId,
        items: [{
            price_data: {
                currency,
                product: price.product,
                unit_amount: amountCents,
                recurring: { interval, interval_count: intervalCount },
            }
        }],
        payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
    });
}

export { stripe };
