import { neon } from '@neondatabase/serverless';
import { db } from '@/Drizzle/index.ts';
import { user } from '@/Drizzle/db/schema';
import { inArray, eq } from 'drizzle-orm';
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
        )
        SELECT
            u.id,
            u.migration_type AS current_type,
            sub.stripe_subscription_id,
            sub.authorize_subscription_id,
            sub.data,
            (act.user_id IS NOT NULL) AS is_active
        FROM "user" u
        LEFT JOIN sub ON sub.user_id = u.id
        LEFT JOIN active_signals act ON act.user_id = u.id
    `;

    const now = new Date();
    const counts = { stripe: 0, auth_net_subscriber: 0, active_current: 0, active_expired: 0, inactive: 0 };
    const updatesByType = { stripe: [], auth_net_subscriber: [], active_current: [], active_expired: [], inactive: [] };

    for (const u of rows) {
        let type;

        if (u.stripe_subscription_id) {
            type = 'stripe';
        } else if (u.authorize_subscription_id) {
            type = 'auth_net_subscriber';
        } else if (u.is_active) {
            let renewalDate = null;
            try {
                const data = JSON.parse(u.data ?? '{}');
                const raw = data.renewaldate ?? data.nextPaymentDate;
                if (raw && typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
                    renewalDate = new Date(raw);
                }
            } catch (_) {}
            type = (renewalDate && renewalDate > now) ? 'active_current' : 'active_expired';
        } else {
            type = 'inactive';
        }

        counts[type]++;
        if (u.current_type !== type) {
            updatesByType[type].push(u.id);
        }
    }

    const totalChanges = Object.values(updatesByType).reduce((s, a) => s + a.length, 0);

    for (const [type, ids] of Object.entries(updatesByType)) {
        if (ids.length === 0) continue;
        await db.update(user).set({ migrationType: type }).where(inArray(user.id, ids));
    }

    const elapsed = Date.now() - start;
    logger.info('classifyUsers.complete', { totalUsers: rows.length, totalChanges, counts, elapsedMs: elapsed });

    return Response.json({ ok: true, totalUsers: rows.length, totalChanges, counts, elapsedMs: elapsed });
}
