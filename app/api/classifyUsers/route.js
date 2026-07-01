import { neon } from '@neondatabase/serverless';
import { db } from '@/Drizzle/index.ts';
import { user } from '@/Drizzle/db/schema';
import { inArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { stripe } from '@/lib/stripeServerFunction';
import { updateUserSettingStatus } from '@/lib/userSettings';

function parseRenewalDate(rawData) {
    try {
        const data = JSON.parse(rawData ?? '{}');
        const raw = data.renewaldate ?? data.nextPaymentDate;
        if (raw && typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
            return new Date(raw);
        }
    } catch (_) {}
    return null;
}

// Defense-in-depth against missed webhooks: a stripe_subscription_id alone never
// proves a subscription is still active, only that one existed at some point.
async function verifyStripeLive(subscriptionId) {
    try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ['items.data.price'] });
        const active = sub.status === 'active' || sub.status === 'trialing';
        const periodEnd = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end ?? null;
        return { ok: true, active, status: sub.status, periodEnd: periodEnd ? new Date(periodEnd * 1000) : null };
    } catch (e) {
        // resource_missing is a confident signal (the sub genuinely doesn't exist in
        // live Stripe). Anything else (rate limit, network, timeout) is transient —
        // it tells us nothing, so callers must not treat it as "confirmed inactive".
        const notFound = e?.code === 'resource_missing' || /No such subscription/i.test(e?.message ?? '');
        return { ok: false, notFound, error: e?.message };
    }
}

// Simple concurrency-limited mapper so we don't blow through Stripe's rate limit
// when many users need a live recheck in the same run.
async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
        while (next < items.length) {
            const i = next++;
            results[i] = await fn(items[i], i);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
}

export async function GET(request) {
    const start = Date.now();
    const sql = neon(process.env.DATABASE_URL);
    const dryRun = new URL(request.url).searchParams.get('dryRun') === 'true';

    const rows = await sql`
        WITH active_signals AS (
            SELECT DISTINCT user_id FROM session
            UNION
            SELECT DISTINCT user_id FROM user_logs
            UNION
            SELECT DISTINCT user_id FROM user_setting WHERE type = 'levelPath'
        ),
        sub AS (
            SELECT DISTINCT ON (user_id)
                id AS setting_id,
                user_id,
                stripe_subscription_id,
                authorize_subscription_id,
                status,
                data
            FROM user_setting
            WHERE type = 'subscription'
            ORDER BY user_id, id DESC
        ),
        purchases AS (
            SELECT DISTINCT user_id FROM user_setting WHERE type = 'purchase'
        )
        SELECT
            u.id,
            u.email,
            u.migration_type      AS current_type,
            u.customer_segment    AS current_segment,
            sub.setting_id,
            sub.stripe_subscription_id,
            sub.authorize_subscription_id,
            sub.status,
            sub.data,
            (act.user_id IS NOT NULL)  AS is_active,
            (pur.user_id IS NOT NULL)  AS has_purchase
        FROM "user" u
        LEFT JOIN sub       ON sub.user_id = u.id
        LEFT JOIN active_signals act ON act.user_id = u.id
        LEFT JOIN purchases pur ON pur.user_id = u.id
    `;

    const now = new Date();
    const migrationCounts  = { current: 0, noncurrent: 0 };
    const segmentCounts    = { stripe: 0, auth_net: 0, subscriber: 0, purchased: 0, lapsed: 0, inactive: 0 };
    const updatesByType    = {};

    for (const u of rows) {
        u._renewalDate = parseRenewalDate(u.data);
    }

    // Only recheck live Stripe for stripe users whose stored renewal date is
    // missing or already expired — everyone else is trusted from the cache.
    const needsRecheck = rows.filter(u => u.stripe_subscription_id && !(u._renewalDate && u._renewalDate > now));
    const recheckResults = await mapWithConcurrency(needsRecheck, 5, u => verifyStripeLive(u.stripe_subscription_id));
    const recheckMap = new Map(needsRecheck.map((u, i) => [u.id, recheckResults[i]]));

    const stripeRecheckDetail = [];

    for (const u of rows) {
        let migrationType, customerSegment;

        if (u.stripe_subscription_id) {
            const dateValid = u._renewalDate && u._renewalDate > now;

            if (dateValid) {
                migrationType   = 'current';
                customerSegment = 'stripe';
            } else {
                const live = recheckMap.get(u.id);
                const detail = {
                    userId: u.id,
                    email: u.email,
                    subscriptionId: u.stripe_subscription_id,
                    storedRenewalDate: u._renewalDate,
                    storedStatus: u.status,
                };

                if (live.ok && live.active) {
                    // Confirmed active via live Stripe — trust it and self-heal the stale cache.
                    migrationType   = 'current';
                    customerSegment = 'stripe';
                    detail.liveStatus = live.status;
                    detail.resultingClassification = 'current/stripe';

                    if (u.setting_id) {
                        let data = {};
                        try { data = JSON.parse(u.data ?? '{}'); } catch (_) {}
                        const healedData = JSON.stringify({
                            ...data,
                            renewaldate: live.periodEnd ? live.periodEnd.toISOString() : data.renewaldate,
                        });
                        detail.selfHeal = { status: live.status, renewaldate: live.periodEnd?.toISOString() ?? data.renewaldate };
                        if (!dryRun) {
                            await updateUserSettingStatus({ id: u.setting_id }, live.status, healedData);
                            logger.info('classifyUsers.stripe_self_healed', { userId: u.id, settingId: u.setting_id, status: live.status });
                        }
                    }
                } else if (live.ok && !live.active) {
                    // Confirmed inactive via live Stripe (canceled, past_due, etc.) — safe to lapse.
                    migrationType   = 'noncurrent';
                    customerSegment = 'lapsed';
                    detail.liveStatus = live.status;
                    detail.resultingClassification = 'noncurrent/lapsed';

                    if (u.setting_id) {
                        let data = {};
                        try { data = JSON.parse(u.data ?? '{}'); } catch (_) {}
                        const healedData = JSON.stringify({ ...data, status: live.status });
                        detail.selfHeal = { status: live.status };
                        if (!dryRun) {
                            await updateUserSettingStatus({ id: u.setting_id }, live.status, healedData);
                            logger.info('classifyUsers.stripe_confirmed_inactive', { userId: u.id, settingId: u.setting_id, status: live.status });
                        }
                    }
                } else if (live.notFound) {
                    // Confirmed the subscription id doesn't exist in live Stripe — dead reference, safe to lapse.
                    migrationType   = 'noncurrent';
                    customerSegment = 'lapsed';
                    detail.recheckError = live.error;
                    detail.resultingClassification = 'noncurrent/lapsed';
                    logger.warn('classifyUsers.stripe_subscription_not_found', { userId: u.id, subscriptionId: u.stripe_subscription_id, error: live.error });
                } else {
                    // Transient failure (rate limit, network, timeout) — inconclusive, so don't
                    // touch classification. Demoting a real customer on our own API hiccup would
                    // be worse than leaving a stale-but-unconfirmed "current" for one more day.
                    migrationType   = u.current_type ?? 'noncurrent';
                    customerSegment = u.current_segment ?? 'inactive';
                    detail.recheckError = live.error;
                    detail.resultingClassification = `unchanged (${migrationType}/${customerSegment})`;
                    logger.warn('classifyUsers.stripe_recheck_inconclusive', { userId: u.id, subscriptionId: u.stripe_subscription_id, error: live.error });
                }

                stripeRecheckDetail.push(detail);
            }
        } else if (u.authorize_subscription_id) {
            migrationType   = 'current';
            customerSegment = 'auth_net';
        } else if (u._renewalDate && u._renewalDate > now) {
            migrationType   = 'current';
            customerSegment = 'subscriber';
        } else if (u.has_purchase) {
            migrationType   = 'noncurrent';
            customerSegment = 'purchased';
        } else if (u.is_active) {
            migrationType   = 'noncurrent';
            customerSegment = 'lapsed';
        } else {
            migrationType   = 'noncurrent';
            customerSegment = 'inactive';
        }

        migrationCounts[migrationType]++;
        segmentCounts[customerSegment]++;

        if (u.current_type !== migrationType || u.current_segment !== customerSegment) {
            const key = `${migrationType}::${customerSegment}`;
            if (!updatesByType[key]) updatesByType[key] = { migrationType, customerSegment, ids: [], emails: [] };
            updatesByType[key].ids.push(u.id);
            updatesByType[key].emails.push(u.email);
        }
    }

    const totalChanges = Object.values(updatesByType).reduce((s, g) => s + g.ids.length, 0);

    if (!dryRun) {
        for (const { migrationType, customerSegment, ids } of Object.values(updatesByType)) {
            await db.update(user)
                .set({ migrationType, customerSegment })
                .where(inArray(user.id, ids));
        }
    }

    const elapsed = Date.now() - start;
    const stripeRechecked = needsRecheck.length;
    const stripeRecheckFailed = recheckResults.filter(r => r.ok === false).length;
    const changes = Object.values(updatesByType).map(({ migrationType, customerSegment, ids, emails }) => ({
        migrationType, customerSegment, count: ids.length, emails,
    }));
    logger.info('classifyUsers.complete', { dryRun, totalUsers: rows.length, totalChanges, migrationCounts, segmentCounts, stripeRechecked, stripeRecheckFailed, elapsedMs: elapsed });

    return Response.json({
        ok: true, dryRun, totalUsers: rows.length, totalChanges, migrationCounts, segmentCounts,
        stripeRechecked, stripeRecheckFailed, stripeRecheckDetail, changes, elapsedMs: elapsed,
    });
}
