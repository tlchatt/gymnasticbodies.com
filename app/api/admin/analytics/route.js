import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { neon } from '@neondatabase/serverless';

const RENEWAL_EVENTS = [
  'renew.page_view',
  'renew.form_submit',
  'renew.card_error',
  'renewal.attempt',
  'renewal.success',
];

const SUBSCRIBE_EVENTS = [
  'subscribe.page_view',
  'signup.attempt',
  'signup.success',
  'signup.failed',
  'signup.duplicate',
];

const OFFER_EVENTS = [
  'offer.page_view',
  'offer.eligibility_check',
  'offer.form_submit',
  'offer.attempt',
  'offer.success',
  'offer.card_error',
];

function toRenewalFunnel(rows) {
  const map = Object.fromEntries(rows.map((r) => [r.event, Number(r.cnt)]));
  return {
    pageViews:   map['renew.page_view']  ?? 0,
    formSubmits: map['renew.form_submit'] ?? 0,
    cardErrors:  map['renew.card_error']  ?? 0,
    attempts:    map['renewal.attempt']   ?? 0,
    successes:   map['renewal.success']   ?? 0,
  };
}

function toSubscribeFunnel(rows) {
  const map = Object.fromEntries(rows.map((r) => [r.event, Number(r.cnt)]));
  return {
    pageViews:  map['subscribe.page_view'] ?? 0,
    attempts:   map['signup.attempt']      ?? 0,
    successes:  map['signup.success']      ?? 0,
    failed:     map['signup.failed']       ?? 0,
    duplicates: map['signup.duplicate']    ?? 0,
  };
}

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const sql = neon(process.env.DATABASE_URL);

  const [
    renewal30, renewal7, renewal1,
    subscribe30, subscribe7, subscribe1,
    breakdown,
    recentRenewals,
    recentSignups,
    offerRows,
    recentOfferConversions,
  ] = await Promise.all([
    // Renewal funnel — 30d / 7d / 24h
    sql`SELECT event, count(*)::int AS cnt FROM app_logs
        WHERE event = ANY(${RENEWAL_EVENTS}) AND ts >= NOW() - INTERVAL '30 days'
        GROUP BY event`,
    sql`SELECT event, count(*)::int AS cnt FROM app_logs
        WHERE event = ANY(${RENEWAL_EVENTS}) AND ts >= NOW() - INTERVAL '7 days'
        GROUP BY event`,
    sql`SELECT event, count(*)::int AS cnt FROM app_logs
        WHERE event = ANY(${RENEWAL_EVENTS}) AND ts >= NOW() - INTERVAL '1 day'
        GROUP BY event`,

    // Subscribe funnel — 30d / 7d / 24h
    sql`SELECT event, count(*)::int AS cnt FROM app_logs
        WHERE event = ANY(${SUBSCRIBE_EVENTS}) AND ts >= NOW() - INTERVAL '30 days'
        GROUP BY event`,
    sql`SELECT event, count(*)::int AS cnt FROM app_logs
        WHERE event = ANY(${SUBSCRIBE_EVENTS}) AND ts >= NOW() - INTERVAL '7 days'
        GROUP BY event`,
    sql`SELECT event, count(*)::int AS cnt FROM app_logs
        WHERE event = ANY(${SUBSCRIBE_EVENTS}) AND ts >= NOW() - INTERVAL '1 day'
        GROUP BY event`,

    // User breakdown by migration_type
    sql`SELECT migration_type, count(*)::int AS cnt FROM "user"
        GROUP BY migration_type ORDER BY cnt DESC`,

    // Recent successful renewals
    sql`SELECT id, ts, email FROM app_logs
        WHERE event = 'renewal.success' ORDER BY ts DESC LIMIT 20`,

    // Recent new signups
    sql`SELECT id, ts, email FROM app_logs
        WHERE event = 'signup.success' ORDER BY ts DESC LIMIT 20`,

    // Offer events — all time, fetch raw rows, group by slug in JS
    sql`SELECT event, email, ts, data FROM app_logs
        WHERE event = ANY(${OFFER_EVENTS})
        ORDER BY ts DESC`,

    // Recent offer conversions
    sql`SELECT id, ts, email, data FROM app_logs
        WHERE event = 'offer.success' ORDER BY ts DESC LIMIT 20`,
  ]);

  // Build per-slug offer funnels from raw rows (data is json — can't use ->> in parameterized queries)
  const offerBySlug = {};
  for (const row of offerRows) {
    const slug = row.data?.slug ?? 'unknown';
    if (!offerBySlug[slug]) {
      offerBySlug[slug] = { pageViews: 0, eligibilityChecks: 0, eligibleChecks: 0, formSubmits: 0, cardErrors: 0, attempts: 0, successes: 0 };
    }
    const f = offerBySlug[slug];
    if (row.event === 'offer.page_view')        f.pageViews++;
    if (row.event === 'offer.eligibility_check') {
      f.eligibilityChecks++;
      if (row.data?.eligible) f.eligibleChecks++;
    }
    if (row.event === 'offer.form_submit')  f.formSubmits++;
    if (row.event === 'offer.card_error')   f.cardErrors++;
    if (row.event === 'offer.attempt')      f.attempts++;
    if (row.event === 'offer.success')      f.successes++;
  }

  return NextResponse.json({
    renewalFunnel: {
      '30d': toRenewalFunnel(renewal30),
      '7d':  toRenewalFunnel(renewal7),
      '1d':  toRenewalFunnel(renewal1),
    },
    subscribeFunnel: {
      '30d': toSubscribeFunnel(subscribe30),
      '7d':  toSubscribeFunnel(subscribe7),
      '1d':  toSubscribeFunnel(subscribe1),
    },
    userBreakdown: breakdown.map((r) => ({
      migrationType: r.migration_type ?? 'unknown',
      count: r.cnt,
    })),
    recentRenewals: recentRenewals.map((r) => ({ id: r.id, ts: r.ts, email: r.email })),
    recentSignups:  recentSignups.map((r)  => ({ id: r.id, ts: r.ts, email: r.email })),
    offerFunnels: offerBySlug,
    recentOfferConversions: recentOfferConversions.map((r) => ({
      id: r.id, ts: r.ts, email: r.email, slug: r.data?.slug ?? '—', price: r.data?.price ?? '—',
    })),
  });
}
