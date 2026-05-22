// One-off: create app_logs table and mark both migrations as applied in __drizzle_migrations.
// Run: node claudePlans/apply-app-logs-migration.js
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
    await client.connect();

    // Create drizzle migrations tracking table if needed
    await client.query(`
        CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
            id SERIAL PRIMARY KEY,
            hash text NOT NULL,
            created_at bigint
        )
    `);

    // Check which migrations are already recorded
    const { rows } = await client.query('SELECT hash FROM "__drizzle_migrations"');
    const recorded = new Set(rows.map(r => r.hash));
    console.log('Already recorded migrations:', [...recorded]);

    // Record 0000_next_iceman if not already tracked
    const hash0000 = '0000_next_iceman';
    if (!recorded.has(hash0000)) {
        await client.query(
            `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
            [hash0000, 1779138620073]
        );
        console.log('Recorded 0000_next_iceman as applied.');
    }

    // Create app_logs table
    await client.query(`
        CREATE TABLE IF NOT EXISTS "app_logs" (
            "id" serial PRIMARY KEY NOT NULL,
            "ts" timestamp DEFAULT now() NOT NULL,
            "level" text NOT NULL,
            "event" text NOT NULL,
            "email" text,
            "user_id" text,
            "source" text DEFAULT 'app.gymnasticbodies.com',
            "data" json
        )
    `);
    console.log('app_logs table ready.');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS "app_logs_event_idx" ON "app_logs" USING btree ("event")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "app_logs_ts_idx" ON "app_logs" USING btree ("ts")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "app_logs_email_idx" ON "app_logs" USING btree ("email")`);
    console.log('Indexes created.');

    // Record 0001_smart_black_queen
    const hash0001 = '0001_smart_black_queen';
    if (!recorded.has(hash0001)) {
        await client.query(
            `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2)`,
            [hash0001, 1779390987133]
        );
        console.log('Recorded 0001_smart_black_queen as applied.');
    }

    await client.end();
    console.log('\nDone. app_logs table is live in Neon.');
}

run().catch(err => { console.error(err); client.end(); process.exit(1); });
