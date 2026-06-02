import { neon } from '@neondatabase/serverless';
import { db } from '@/Drizzle/index.ts';
import { user } from '@/Drizzle/db/schema';
import { inArray } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET(request) {
    const start = Date.now();
    const sql = neon(process.env.DATABASE_URL);

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
                user_id,
                stripe_subscription_id,
                authorize_subscription_id,
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
            u.migration_type      AS current_type,
            u.customer_segment    AS current_segment,
            sub.stripe_subscription_id,
            sub.authorize_subscription_id,
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
        let migrationType, customerSegment;

        if (u.stripe_subscription_id) {
            migrationType   = 'current';
            customerSegment = 'stripe';
        } else if (u.authorize_subscription_id) {
            migrationType   = 'current';
            customerSegment = 'auth_net';
        } else {
            // Check for valid future renewal date
            let renewalDate = null;
            try {
                const data = JSON.parse(u.data ?? '{}');
                const raw = data.renewaldate ?? data.nextPaymentDate;
                if (raw && typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
                    renewalDate = new Date(raw);
                }
            } catch (_) {}

            if (renewalDate && renewalDate > now) {
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
        }

        migrationCounts[migrationType]++;
        segmentCounts[customerSegment]++;

        if (u.current_type !== migrationType || u.current_segment !== customerSegment) {
            const key = `${migrationType}::${customerSegment}`;
            if (!updatesByType[key]) updatesByType[key] = { migrationType, customerSegment, ids: [] };
            updatesByType[key].ids.push(u.id);
        }
    }

    const totalChanges = Object.values(updatesByType).reduce((s, g) => s + g.ids.length, 0);

    for (const { migrationType, customerSegment, ids } of Object.values(updatesByType)) {
        await db.update(user)
            .set({ migrationType, customerSegment })
            .where(inArray(user.id, ids));
    }

    const elapsed = Date.now() - start;
    logger.info('classifyUsers.complete', { totalUsers: rows.length, totalChanges, migrationCounts, segmentCounts, elapsedMs: elapsed });

    return Response.json({ ok: true, totalUsers: rows.length, totalChanges, migrationCounts, segmentCounts, elapsedMs: elapsed });
}
