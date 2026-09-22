import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { db } from '@/Drizzle/index.ts';
import { outbound_emails, user } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/logger';
import { getOffer, formatPrice } from '@/lib/pricing';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const OFFER_SLUG = 'legacy15';
const TYPE = 'marketing';

// Paced sending: the cron runs hourly (see vercel.json) and sends this many per
// run, so the daily volume (~PER_RUN * 24) goes out spread across the day in small
// batches rather than one large burst — better for deliverability and it keeps each
// serverless invocation well under the function time limit. Target ~1,000/day.
const PER_RUN = 42;            // 42 * 24 ≈ 1,008 per day
const SEND_GAP_MS = 200;       // brief pause between sends to stay gentle on SendGrid

// Give the invocation headroom for PER_RUN sequential sends.
export const maxDuration = 60;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SUBJECT = 'A special offer for GymnasticBodies legacy members';
// Prices are {{variable}}-driven from the pricing config — never literals.
const BODY = `Hi {{name}},

As a former GymnasticBodies member, we would like to extend a special offer exclusively for you.

For a limited time, you may rejoin for just {{offerPrice}}/month - a massive savings off the regular rate of {{offerRegularRate}}/month. This special rate is reserved solely for Legacy Members like yourself who were a part of the original GymnasticBodies community.

Your exclusive offer link: {{offerLink}}

Questions? Just reply to this email and we'll be happy to help.

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
  const offer = await getOffer(OFFER_SLUG);
  if (!offer || offer.active === false) {
    logger.info('marketing_drip.offer_missing', { slug: OFFER_SLUG });
    return NextResponse.json({ ok: true, skipped: 'offer not found' });
  }
  const CAMPAIGN = offer.campaign;
  const priceVars = {
    offerPrice: formatPrice(offer.amount),
    offerRegularRate: formatPrice(offer.regularRate),
  };

  if (new Date() > new Date(offer.endDate)) {
    logger.info('marketing_drip.campaign_ended', { campaign: CAMPAIGN });
    return NextResponse.json({ ok: true, skipped: 'campaign ended' });
  }

  const sql = neon(process.env.DATABASE_URL);

  const candidates = await sql`
    SELECT u.id, u.email, u.name
    FROM "user" u
    LEFT JOIN user_setting us ON us.user_id = u.id AND us.type = 'subscription'
    WHERE u.migration_type = 'noncurrent'
      AND u.email_status IS NULL
      AND (
        (NULLIF(NULLIF(us.data::jsonb->>'renewaldate', 'N/A'), '') IS NOT NULL
         AND (NULLIF(NULLIF(us.data::jsonb->>'renewaldate', 'N/A'), ''))::date < NOW() - INTERVAL '4 months')
        OR
        (NULLIF(NULLIF(us.data::jsonb->>'renewaldate', 'N/A'), '') IS NULL
         AND u.created_at < NOW() - INTERVAL '4 months')
      )
      AND u.email NOT IN (
        SELECT to_email FROM outbound_emails WHERE campaign = ${CAMPAIGN}
      )
    GROUP BY u.id, u.email, u.name, u.created_at, us.data
    ORDER BY COALESCE((NULLIF(NULLIF(us.data::jsonb->>'renewaldate', 'N/A'), ''))::date, u.created_at::date) ASC
    LIMIT ${PER_RUN}
  `;

  const results = { sent: 0, errors: 0, emails: [] };

  for (const row of candidates) {
    const email = row.email.trim().toLowerCase();
    const name = firstName(row.name);
    const offerLink = `https://app.gymnasticbodies.com/offer/${OFFER_SLUG}?email=${encodeURIComponent(email)}`;
    const renderedBody = render(BODY, { name: name || '', email, offerLink, ...priceVars });

    try {
      await sgMail.send({
        to: email,
        from: { email: 'marketing@gymnasticbodies.com', name: 'GymnasticBodies' },
        replyTo: 'support@gymnasticbodies.com',
        subject: SUBJECT,
        text: renderedBody,
      });

      await db.insert(outbound_emails).values({
        userId: row.id ?? null,
        toEmail: email,
        subject: SUBJECT,
        body: renderedBody,
        campaign: CAMPAIGN,
        type: TYPE,
        sentAt: new Date(),
      });

      logger.info('marketing_drip.sent', { email, userId: row.id ?? null });
      results.sent++;
      results.emails.push({ email, status: 'sent' });
    } catch (err) {
      logger.error('marketing_drip.error', { email, error: err.message });
      results.errors++;
      results.emails.push({ email, status: 'error', error: err.message });
    }

    await sleep(SEND_GAP_MS);
  }

  return NextResponse.json({ ok: true, ...results });
}
