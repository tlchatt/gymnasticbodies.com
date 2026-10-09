import Stripe from 'stripe';
import { db } from '@/Drizzle/index.ts';
import { user_setting } from '@/Drizzle/db/schema';
import { eq, and, sql as dsql } from 'drizzle-orm';

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

/**
 * Mint a new recurring Stripe Price on the SAME product as the current Subscribe Price, and
 * return its id. Called when an admin changes the Subscribe amount: new signups bill this new
 * Price; every existing subscription keeps its old Price object (grandfathered — Stripe never
 * re-prices a live subscription). `anchorPriceId` supplies the product to attach to.
 */
export async function createRecurringPrice({ amountCents, currency = 'usd', interval, intervalCount = 1, anchorPriceId, nickname }) {
    const anchor = await stripe.prices.retrieve(anchorPriceId || process.env.STRIPE_PRICE_ID);
    const price = await stripe.prices.create({
        currency,
        product: anchor.product,
        unit_amount: amountCents,
        recurring: { interval, interval_count: intervalCount },
        ...(nickname ? { nickname } : {}),
    });
    return price.id;
}

export { stripe };

// Live-Stripe duplicate guard: does ANY Stripe customer with this email carry a
// subscription that still bills (active/trialing/past_due)? The Neon-side check
// misses subs created on a second customer record — that double-billed real members.
// customers.list({ email }) is case-sensitive, so a customer saved as "Name@x.com" is invisible
// to a lowercase lookup. customers.search matches case-insensitively; use both.
export async function findStripeCustomersByEmail(email) {
    const { data: listed } = await stripe.customers.list({ email, limit: 10 });
    const { data: searched } = await stripe.customers.search({ query: `email:'${String(email).replace(/'/g, "\\'")}'`, limit: 10 });
    const seen = new Set();
    return [...listed, ...searched].filter(c => !seen.has(c.id) && seen.add(c.id));
}

export async function findActiveStripeSubByEmail(email) {
    const customers = await findStripeCustomersByEmail(email);
    for (const c of customers) {
        const { data: subs } = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 10 });
        const live = subs.find(s => ['active', 'trialing', 'past_due'].includes(s.status));
        if (live) return live;
    }
    return null;
}

// Every Stripe customer that belongs to a member, from every place we know to look. Email alone
// is not enough: a member who changed their email in Neon keeps the OLD email on their Stripe
// customer (Neon never pushes it), so only the stored stripe_customer_id finds them. Sources:
//   1. user_setting.stripe_customer_id (column) and data.stripeCustomerId for the member's rows
//   2. findStripeCustomersByEmail (list + case-insensitive search) for the given email, the
//      exact-case email(s) on the Neon user row, and any email stored in user_setting data
// Returns [{ id, email, customer, sources: [...] }], de-duplicated, deleted customers dropped.
// Read-only.
export async function resolveStripeCustomers(email, { userId } = {}) {
    const e = String(email || '').trim();
    const { rows: users } = await db.execute(dsql`SELECT id, email FROM "user" WHERE lower(email) = lower(${e}) OR id = ${userId || ''}`);
    const ids = users.map(u => u.id);
    const { rows: settings } = ids.length
        ? await db.execute(dsql`SELECT user_id, stripe_customer_id, data FROM user_setting WHERE user_id IN ${ids}`)
        : { rows: [] };

    const found = new Map(); // id -> { id, email, customer, sources }
    const add = (c, source) => {
        if (!c || c.deleted) return;
        const cur = found.get(c.id) || { id: c.id, email: c.email || null, customer: c, sources: [] };
        if (!cur.sources.includes(source)) cur.sources.push(source);
        found.set(c.id, cur);
    };

    const storedIds = new Set();
    const emails = new Set([e, ...users.map(u => u.email)].filter(Boolean));
    for (const s of settings) {
        if (s.stripe_customer_id) storedIds.add(s.stripe_customer_id);
        let d = s.data;
        for (let i = 0; i < 2; i++) if (typeof d === 'string') { try { d = JSON.parse(d); } catch { break; } }
        if (d && typeof d === 'object') {
            if (typeof d.stripeCustomerId === 'string' && d.stripeCustomerId.startsWith('cus_')) storedIds.add(d.stripeCustomerId);
            if (typeof d.email === 'string' && d.email.includes('@')) emails.add(d.email.trim());
        }
    }
    for (const id of storedIds) {
        try { add(await stripe.customers.retrieve(id), 'neon:stripe_customer_id'); }
        catch (err) { if (err?.code !== 'resource_missing') throw err; }
    }
    for (const em of emails) {
        for (const c of await findStripeCustomersByEmail(em)) add(c, `email:${em}`);
    }
    return [...found.values()];
}

// Subscriptions that still bill (or are in a credited/trial window) across a set of customers.
export const LIVE_SUB_STATUSES = ['active', 'trialing', 'past_due', 'unpaid'];
export async function listSubscriptionsForCustomers(customers) {
    const out = [];
    for (const c of customers) {
        const { data } = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 20 });
        out.push(...data);
    }
    return out;
}
