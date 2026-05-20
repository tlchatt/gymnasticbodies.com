// Classify all users into migration_type groups and optionally write to DB
// Run with: node claudePlans/classify-users.js          (dry run)
//           node claudePlans/classify-users.js --write  (commit to DB)

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { Pool } = require('pg');

const WRITE_MODE = process.argv.includes('--write');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
    console.log(`\nClassifying users (${WRITE_MODE ? 'WRITE MODE' : 'DRY RUN'})...\n`);

    // All users with their subscription setting and activity signals
    const { rows: users } = await pool.query(`
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
            u.email,
            u.name,
            u.migration_type AS current_type,
            sub.stripe_subscription_id,
            sub.authorize_subscription_id,
            sub.data,
            (act.user_id IS NOT NULL) AS is_active
        FROM "user" u
        LEFT JOIN sub ON sub.user_id = u.id
        LEFT JOIN active_signals act ON act.user_id = u.id
    `);

    const counts = { stripe: 0, auth_net_subscriber: 0, active_current: 0, active_expired: 0, inactive: 0 };
    const updates = [];

    for (const u of users) {
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

            if (renewalDate && renewalDate > new Date()) {
                type = 'active_current';
            } else {
                type = 'active_expired';
            }
        } else {
            type = 'inactive';
        }

        counts[type]++;
        if (u.current_type !== type) {
            updates.push({ id: u.id, email: u.email, from: u.current_type, to: type });
        }
    }

    // Print summary
    console.log('='.repeat(60));
    console.log('CLASSIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`  stripe              : ${counts.stripe}`);
    console.log(`  auth_net_subscriber : ${counts.auth_net_subscriber}`);
    console.log(`  active_current      : ${counts.active_current}`);
    console.log(`  active_expired      : ${counts.active_expired}`);
    console.log(`  inactive            : ${counts.inactive}`);
    console.log(`  TOTAL               : ${users.length}`);
    console.log('='.repeat(60));
    console.log(`\n${updates.length} users would change migration_type\n`);

    // Print changes (cap at 50 lines to avoid flooding terminal)
    const preview = updates.slice(0, 50);
    for (const u of preview) {
        console.log(`  ${u.email.padEnd(45)} ${String(u.from ?? 'null').padEnd(20)} → ${u.to}`);
    }
    if (updates.length > 50) console.log(`  ... and ${updates.length - 50} more`);

    if (WRITE_MODE) {
        console.log('\nWriting to Neon...');
        // Batch updates by type for efficiency
        for (const type of Object.keys(counts)) {
            const ids = updates.filter(u => u.to === type).map(u => u.id);
            if (ids.length === 0) continue;
            await pool.query(
                `UPDATE "user" SET migration_type = $1 WHERE id = ANY($2::text[])`,
                [type, ids]
            );
            console.log(`  Set ${ids.length} users → ${type}`);
        }
        // Also set users whose type matches current (first-time run, current_type = null)
        const allByType = {};
        for (const u of users) {
            const type = u.current_type === null
                ? (updates.find(x => x.id === u.id)?.to ?? null)
                : null;
            if (type) {
                allByType[type] = allByType[type] ?? [];
                allByType[type].push(u.id);
            }
        }
        console.log('\nDone.');
    } else {
        console.log('\nDry run — no changes written. Re-run with --write to commit.');
    }

    await pool.end();
}

main().catch(err => {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
});
