// Internal payment block list + "ban member". Owner rule (2026-10-08): a member who files a
// chargeback is banned for good — every subscription cancelled, every account banned and signed
// out, and every card, email and Stripe customer they used blocked so checkout refuses them again.
// The card is the block that matters (emails are trivial to change); a card is identified by its
// Stripe fingerprint, which is stable across customers and re-entry.
//
// Our table `blocked_payment_identities` (Drizzle/raw/blocked_payment_identities.sql) is the source
// of truth; Stripe Radar's default block lists are mirrored best-effort as a second layer.
import { db } from '@/Drizzle/index.ts';
import { sql as dsql } from 'drizzle-orm';
import { stripe, resolveStripeCustomers, LIVE_SUB_STATUSES, normBlockValue as norm } from '@/lib/stripeServerFunction';
import { logger } from '@/lib/logger';
import { suppressCancellationNotice } from '@/lib/cancellationNotice';

const RADAR_LIST = { card_fingerprint: 'card_fingerprint_blocklist', email: 'email_blocklist', stripe_customer: 'customer_id_blocklist' };

async function addToRadar(type, value) {
    try {
        const { data } = await stripe.radar.valueLists.list({ alias: RADAR_LIST[type], limit: 1 });
        if (!data[0]) return false;
        await stripe.radar.valueListItems.create({ value_list: data[0].id, value });
        return true;
    } catch (err) {
        return /already exists/i.test(err?.message || '');
    }
}

// Ban a member everywhere. Seeds: any of customerIds / emails / cardFingerprints (e.g. from a
// dispute's charge). Expands to every Neon account and Stripe customer tied to them, and every
// card those customers ever paid with. Never deletes a Stripe customer; never refunds.
export async function banMember({ customerIds = [], emails = [], cardFingerprints = [], reason, actor = 'system' }) {
    const customers = new Set(customerIds.filter(Boolean));
    const mails = new Set(emails.filter(Boolean).map((e) => e.trim()));
    const cards = new Set(cardFingerprints.filter(Boolean));

    // Stripe customers → their emails; emails → more customers (case-insensitive + Neon-stored ids).
    for (const id of [...customers]) {
        try { const c = await stripe.customers.retrieve(id); if (!c.deleted && c.email) mails.add(c.email); } catch { /* gone */ }
    }
    for (const e of [...mails]) {
        try { for (const c of await resolveStripeCustomers(e)) { customers.add(c.id); if (c.email) mails.add(c.email); } } catch { /* lookup failure is non-fatal */ }
    }
    // Every card each customer ever paid with (charges keep the fingerprint even after a card is detached).
    for (const id of customers) {
        try {
            for await (const ch of stripe.charges.list({ customer: id, limit: 100 })) {
                const fp = ch.payment_method_details?.card?.fingerprint; if (fp) cards.add(fp);
                const em = ch.billing_details?.email || ch.receipt_email; if (em) mails.add(em);
            }
        } catch { /* non-fatal */ }
    }

    // Neon accounts: by email, plus any account whose setting points at one of the customers.
    const lower = [...new Set([...mails].map((e) => e.toLowerCase()))];
    const custList = [...customers];
    const byEmail = lower.length ? (await db.execute(dsql`SELECT id, email FROM "user" WHERE lower(email) IN ${lower}`)).rows : [];
    const byCustomer = custList.length ? (await db.execute(dsql`SELECT u.id, u.email FROM "user" u JOIN user_setting s ON s.user_id = u.id WHERE s.stripe_customer_id IN ${custList}`)).rows : [];
    const users = [...new Map([...byEmail, ...byCustomer].map((u) => [u.id, u])).values()];
    for (const u of users) mails.add(u.email);

    // 1. Cancel every live subscription now.
    const cancelled = [];
    for (const id of customers) {
        try {
            const { data } = await stripe.subscriptions.list({ customer: id, status: 'all', limit: 100 });
            for (const s of data.filter((x) => LIVE_SUB_STATUSES.includes(x.status))) {
                // A ban sends NO "subscription cancelled" email — mark it before the cancel so the
                // customer.subscription.deleted webhook that follows stays silent too.
                await suppressCancellationNotice({ subscriptionId: s.id, reason: 'ban' });
                await stripe.subscriptions.cancel(s.id); cancelled.push(s.id);
            }
        } catch (err) { logger.error('ban.cancel_failed', { customerId: id, error: err?.message }); }
    }

    // 2. Block list (ours, then Radar).
    const userId = users[0]?.id || null;
    const entries = [
        ...[...cards].map((v) => ['card_fingerprint', v]),
        ...[...new Set([...mails].map((e) => e.toLowerCase()))].map((v) => ['email', v]),
        ...[...customers].map((v) => ['stripe_customer', v]),
    ];
    for (const [type, value] of entries) {
        await db.execute(dsql`INSERT INTO blocked_payment_identities (type, value, reason, user_id, created_by)
            VALUES (${type}, ${norm(type, value)}, ${reason || null}, ${userId}, ${actor}) ON CONFLICT (type, value) DO NOTHING`);
        await addToRadar(type, value);
    }

    // 3. Ban + sign out + lapse every account.
    for (const u of users) {
        await db.execute(dsql`UPDATE "user" SET banned = true, "banReason" = ${reason || 'Chargeback'}, migration_type = 'noncurrent', customer_segment = 'lapsed' WHERE id = ${u.id}`);
        await db.execute(dsql`UPDATE user_setting SET status = 'cancelled' WHERE user_id = ${u.id} AND type = 'subscription'`);
        await db.execute(dsql`DELETE FROM session WHERE user_id = ${u.id}`);
    }

    const summary = { accounts: users.map((u) => u.email), customers: custList, cards: [...cards], emails: lower, cancelled };
    // Recorded as an action on EACH banned account (shows in the admin account history).
    if (users.length) for (const u of users) logger.warn('admin.member_banned', { email: u.email, userId: u.id, reason, actor, ...summary });
    else logger.warn('admin.member_banned', { email: lower[0] || null, userId: null, reason, actor, ...summary });
    return summary;
}
