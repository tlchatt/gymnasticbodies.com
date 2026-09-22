import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { db } from '@/Drizzle/index.ts';
import { outbound_emails } from '@/Drizzle/db/schema';
import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/logger';
import { getOffer, formatPrice } from '@/lib/pricing';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const OFFER_SLUG = 'legacy15';
const TYPE = 'marketing';

// Fixed "line in the sand": eligible only if they lapsed ON OR BEFORE this date
// (their renewaldate) OR were never active at all (blank renewaldate = never
// subscribed, which is by definition "before the line"). A fixed date — not a
// rolling window — so the audience is stable, self-documenting, and names the
// campaign. 2026-05-22 is the date the new paywall/subscribe/renew system went live.
const LAPSED_ON_OR_BEFORE = '2026-05-22';
const CUTOFF_TAG = '20260522';

// Two crons hit this route every 2 minutes (see vercel.json), one per group,
// offset by a minute so combined they send ~2 emails/minute.
const PER_RUN = 2;             // 2 per run * 720 runs/day ≈ 1,440/day per group
const SEND_GAP_MS = 200;

// Multi-touch: a person may receive the offer up to MAX_SENDS times. First-touchers
// are always served before anyone gets a repeat (ORDER BY sent_count ASC), so the
// list works through touch 1 across everyone, then touch 2, then touch 3.
const MAX_SENDS = 3;

// Group definitions. `engaged` = ex-members with real history (~2.8% conv);
// `cold` = inactive accounts, never active (~0.8%). Each has its own campaign tag.
const GROUPS = {
  engaged: { segments: ['lapsed', 'purchased'], campaign: `legacy_lockin_${CUTOFF_TAG}_engaged` },
  cold: { segments: ['inactive'], campaign: `legacy_lockin_${CUTOFF_TAG}_cold` },
};

export const maxDuration = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Prices are {{variable}}-driven from the pricing config — never literals.
const SUBJECT = 'Lock in your {{offerPrice}} legacy rate before it’s gone';
const BODY = `Hi {{name}},

We're rebuilding GymnasticBodies from the ground up — and as a legacy member, you can come back at your original rate before new pricing takes over.

What's coming:
• A faster, better-looking app with smoother, higher-quality video
• A more dynamic level system with clearer progress and milestone tracking
• Targeted workouts for specific body parts, injuries, and recovery — plus workouts built around the equipment you already have
• New Concierge coaching (personal feedback on your form videos) and live Interactive events
• The community forum back — and a roadmap you help shape

New membership tiers and pricing roll out soon. Right now, you can rejoin at the legacy rate of just {{offerPrice}}/month (instead of {{offerRegularRate}}/month) — locked in for as long as you stay.

Rejoin at {{offerPrice}}/month → {{offerLink}}

This rate is reserved for original members like you and won't come back once the new tiers launch.

Questions? Just reply — we're happy to help.

The GymnasticBodies Team`;

function firstName(fullName) {
  if (!fullName || fullName === 'N/A') return null;
  return fullName.trim().split(/\s+/)[0];
}

function render(template, vars) {
  return template
    .replace(/\{\{name\}\}/g, vars.name || '')
    .replace(/\{\{email\}\}/g, vars.email || '')
    .replace(/\{\{offerLink\}\}/g, vars.offerLink || '')
    .replace(/\{\{offerPrice\}\}/g, vars.offerPrice || '')
    .replace(/\{\{offerRegularRate\}\}/g, vars.offerRegularRate || '');
}

export async function GET(request) {
  const group = new URL(request.url).searchParams.get('group');
  const cfg = GROUPS[group];
  if (!cfg) {
    return NextResponse.json({ error: `unknown group; expected one of ${Object.keys(GROUPS).join(', ')}` }, { status: 400 });
  }
  const CAMPAIGN = cfg.campaign;

  const offer = await getOffer(OFFER_SLUG);
  if (!offer || offer.active === false) {
    logger.info('marketing_drip.offer_missing', { slug: OFFER_SLUG, group });
    return NextResponse.json({ ok: true, skipped: 'offer not found' });
  }
  if (new Date() > new Date(offer.endDate)) {
    logger.info('marketing_drip.campaign_ended', { campaign: CAMPAIGN, group });
    return NextResponse.json({ ok: true, skipped: 'campaign ended' });
  }
  const priceVars = {
    offerPrice: formatPrice(offer.amount),
    offerRegularRate: formatPrice(offer.regularRate),
  };

  const sql = neon(process.env.DATABASE_URL);

  // Eligible = noncurrent, this group's segment(s), a good email, lapsed on/before
  // the cutoff (or never active), fewer than MAX_SENDS prior sends, and NOT already
  // signed up — excluded if they converted through our flows (offer/renewal.success)
  // or carry any linked Stripe subscription id in Neon.
  const candidates = await sql`
    WITH sends AS (
      SELECT lower(to_email) AS email, COUNT(*) AS cnt
      FROM outbound_emails
      WHERE campaign LIKE 'marketing_drip_legacy15%' OR campaign LIKE 'legacy_lockin_%'
      GROUP BY lower(to_email)
    )
    SELECT u.id, u.email, u.name, COALESCE(s.cnt, 0) AS sent_count
    FROM "user" u
    LEFT JOIN user_setting us ON us.user_id = u.id AND us.type = 'subscription'
    LEFT JOIN sends s ON s.email = lower(u.email)
    WHERE u.migration_type = 'noncurrent'
      AND u.email_status IS NULL
      AND u.customer_segment = ANY(${cfg.segments})
      AND (
        NULLIF(NULLIF(us.data::jsonb->>'renewaldate', 'N/A'), '') IS NULL
        OR (NULLIF(NULLIF(us.data::jsonb->>'renewaldate', 'N/A'), ''))::date <= ${LAPSED_ON_OR_BEFORE}::date
      )
      AND COALESCE(s.cnt, 0) < ${MAX_SENDS}
      AND NOT EXISTS (
        SELECT 1 FROM app_logs a
        WHERE lower(a.email) = lower(u.email)
          AND a.event IN ('offer.success', 'renewal.success')
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_setting us2
        WHERE us2.user_id = u.id AND us2.stripe_subscription_id IS NOT NULL
      )
    GROUP BY u.id, u.email, u.name, u.created_at, us.data, s.cnt
    ORDER BY COALESCE(s.cnt, 0) ASC,
             COALESCE((NULLIF(NULLIF(us.data::jsonb->>'renewaldate', 'N/A'), ''))::date, u.created_at::date) ASC
    LIMIT ${PER_RUN}
  `;

  const results = { group, campaign: CAMPAIGN, sent: 0, errors: 0, emails: [] };

  for (const row of candidates) {
    const email = row.email.trim().toLowerCase();
    const name = firstName(row.name);
    const offerLink = `https://app.gymnasticbodies.com/offer/${OFFER_SLUG}?email=${encodeURIComponent(email)}`;
    const renderedBody = render(BODY, { name: name || '', email, offerLink, ...priceVars });
    const renderedSubject = render(SUBJECT, { ...priceVars });

    try {
      await sgMail.send({
        to: email,
        from: { email: 'marketing@gymnasticbodies.com', name: 'GymnasticBodies' },
        replyTo: 'support@gymnasticbodies.com',
        subject: renderedSubject,
        text: renderedBody,
      });

      await db.insert(outbound_emails).values({
        userId: row.id ?? null,
        toEmail: email,
        subject: renderedSubject,
        body: renderedBody,
        campaign: CAMPAIGN,
        type: TYPE,
        sentAt: new Date(),
      });

      logger.info('marketing_drip.sent', { email, userId: row.id ?? null, group, campaign: CAMPAIGN, touch: (row.sent_count ?? 0) + 1 });
      results.sent++;
      results.emails.push({ email, status: 'sent', touch: (row.sent_count ?? 0) + 1 });
    } catch (err) {
      logger.error('marketing_drip.error', { email, error: err.message, group });
      results.errors++;
      results.emails.push({ email, status: 'error', error: err.message });
    }

    await sleep(SEND_GAP_MS);
  }

  return NextResponse.json({ ok: true, ...results });
}
