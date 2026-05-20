import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createStripeCustomer(email, name, phone, country) {
    return stripe.customers.create({ email, name, phone, metadata: { country } });
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
    return stripe.subscriptions.create({
        customer: customerId,
        items: [{
            price_data: {
                currency,
                product_data: { name: 'GymFit TV Subscription' },
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
