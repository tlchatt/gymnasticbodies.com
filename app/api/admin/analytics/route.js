import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { neon } from '@neondatabase/serverless';

const FUNNEL_EVENTS = [
  'renew.page_view',
  'renew.form_submit',
  'renew.card_error',
  'renewal.attempt',
  'renewal.success',
];

function toFunnel(rows) {
  const map = Object.fromEntries(rows.map((r) => [r.event, Number(r.cnt)]));
  return {
    pageViews:   map['renew.page_view']  ?? 0,
    formSubmits: map['renew.form_submit'] ?? 0,
    cardErrors:  map['renew.card_error']  ?? 0,
    attempts:    map['renewal.attempt']   ?? 0,
    successes:   map['renewal.success']   ?? 0,
  };
}

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const sql = neon(process.env.DATABASE_URL);

  const [funnel30, funnel7, funnel1, breakdown, recentConversions] = await Promise.all([
    // 30-day funnel
    sql`
      SELECT event, count(*)::int AS cnt
      FROM app_logs
      WHERE event = ANY(${FUNNEL_EVENTS}) AND ts >= NOW() - INTERVAL '30 days'
      GROUP BY event
    `,
    // 7-day funnel
    sql`
      SELECT event, count(*)::int AS cnt
      FROM app_logs
      WHERE event = ANY(${FUNNEL_EVENTS}) AND ts >= NOW() - INTERVAL '7 days'
      GROUP BY event
    `,
    // 24h funnel
    sql`
      SELECT event, count(*)::int AS cnt
      FROM app_logs
      WHERE event = ANY(${FUNNEL_EVENTS}) AND ts >= NOW() - INTERVAL '1 day'
      GROUP BY event
    `,
    // User breakdown by migration_type
    sql`
      SELECT migration_type, count(*)::int AS cnt
      FROM "user"
      GROUP BY migration_type
      ORDER BY cnt DESC
    `,
    // Recent successful renewals
    sql`
      SELECT id, ts, email
      FROM app_logs
      WHERE event = 'renewal.success'
      ORDER BY ts DESC
      LIMIT 20
    `,
  ]);

  return NextResponse.json({
    funnel: {
      '30d': toFunnel(funnel30),
      '7d':  toFunnel(funnel7),
      '1d':  toFunnel(funnel1),
    },
    userBreakdown: breakdown.map((r) => ({
      migrationType: r.migration_type ?? 'unknown',
      count: r.cnt,
    })),
    recentConversions: recentConversions.map((r) => ({
      id: r.id,
      ts: r.ts,
      email: r.email,
    })),
  });
}
