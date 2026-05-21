const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;

async function runQueries() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('\n========================================');
    console.log('QUERY 1: Session Table Activity (Last 12 Hours)');
    console.log('========================================\n');
    
    const sessions = await sql`
      SELECT COUNT(*) as new_sessions, 
             MIN(created_at) as earliest, 
             MAX(created_at) as latest
      FROM session 
      WHERE created_at > NOW() - INTERVAL '12 hours'
    `;
    console.log(JSON.stringify(sessions, null, 2));

    console.log('\n========================================');
    console.log('QUERY 2a: user_logs Table Structure');
    console.log('========================================\n');
    
    const columns = await sql`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_logs' 
      ORDER BY ordinal_position
    `;
    console.log(JSON.stringify(columns, null, 2));

    console.log('\n========================================');
    console.log('QUERY 2b: user_logs Recent Entries (Last 10)');
    console.log('========================================\n');
    
    const logs = await sql`
      SELECT * FROM user_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    console.log(JSON.stringify(logs, null, 2));

    console.log('\n========================================');
    console.log('QUERY 3: active_expired Users with Recent Sessions');
    console.log('========================================\n');
    
    const activeExpired = await sql`
      SELECT u.email, u.migration_type, s.created_at as session_created, s.token
      FROM "user" u
      JOIN session s ON s.user_id = u.id
      WHERE u.migration_type = 'active_expired'
        AND s.created_at > NOW() - INTERVAL '12 hours'
      ORDER BY s.created_at DESC
    `;
    console.log(JSON.stringify(activeExpired, null, 2));

    console.log('\n========================================');
    console.log('QUERY 4: migration_type Counts');
    console.log('========================================\n');
    
    const migrationCounts = await sql`
      SELECT migration_type, COUNT(*) FROM "user" 
      GROUP BY migration_type 
      ORDER BY count DESC
    `;
    console.log(JSON.stringify(migrationCounts, null, 2));

    console.log('\n========================================');
    console.log('QUERY 5: New Stripe Users (Last 12 Hours)');
    console.log('========================================\n');
    
    const stripeUsers = await sql`
      SELECT u.email, u.name, us.stripe_subscription_id, us.updated_at
      FROM "user" u
      JOIN user_setting us ON us.user_id = u.id AND us.type = 'subscription'
      WHERE u.migration_type = 'stripe'
        AND us.updated_at > NOW() - INTERVAL '12 hours'
      ORDER BY us.updated_at DESC
    `;
    console.log(JSON.stringify(stripeUsers, null, 2));

    console.log('\n========================================');
    console.log('ALL QUERIES COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

runQueries();
