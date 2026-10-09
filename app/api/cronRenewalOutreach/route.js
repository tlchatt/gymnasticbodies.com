// "Having trouble renewing?" (renewal_auto_drip) — claudePlans/communication-flows.md, A10.
// An ADMINISTRATIVE notice around the member's timeline: recorded in outbound_emails as type
// 'administrative', no case. A member reply becomes a support case through the Gmail sync.
//
// Agreed rules (owner 2026-10-09), applied in this order:
//   1. candidates: viewed /renew 24–96 hours ago
//   2. drop anyone who has since paid by ANY route (renewal.success / signup.success /
//      offer.success after their page view)
//   3. drop anyone active right now — Neon migration_type 'current', or a live Stripe subscription
//      that is active/trialing (past_due is NOT dropped: a failed renewal is who this is for).
//      Stripe is checked last, only for the few candidates every other rule let through.
//   4. drop banned members (user.banned) and anyone on the payment block list
//   5. drop anyone with an OPEN support case (closed cases don't block)
//   6. drop anyone sent THIS email in the last 30 days (other emails don't block it)
//   7. drop bounced / invalid / spam addresses (user.email_status)
//   8. send "Hi {first name}," / "Hi there," from + reply-to support@
//
// ?dryRun=1 sends nothing and returns who would be sent and who is skipped by which rule.
// Both modes require the cron secret (Vercel cron sends it) or an admin session.
import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/logger';
import { requireAdminOrCronSecret } from '@/lib/adminAuth';
import { findBlockedIdentity, resolveStripeCustomers, listSubscriptionsForCustomers } from '@/lib/stripeServerFunction';
import { OPEN_CASE_STATUSES } from '@/lib/support/caseFor';

export const maxDuration = 120;

const CAMPAIGN = 'renewal_auto_drip';
const TYPE = 'administrative';
const FROM = 'support@gymnasticbodies.com';
const SUBJECT = 'Having trouble renewing your GymFit membership?';
const BODY = `Hi {{name}},

We noticed you recently visited our renewal page but didn't complete the process.

If you ran into any issues — whether it's a question about pricing, a payment problem, or anything else — just reply to this email and we'll help you out.

Your renewal link: {{renewalLink}}

— The GymFit Team`;
const PAID_EVENTS = ['renewal.success', 'signup.success', 'offer.success'];
const ACTIVE_STRIPE = ['active', 'trialing'];

function firstName(fullName) {
  if (!fullName || fullName === 'N/A') return null;
  return String(fullName).trim().split(/\s+/)[0] || null;
}

function render(template, vars) {
  return template
    .replace(/\{\{name\}\}/g, vars.name || 'there')
    .replace(/\{\{email\}\}/g, vars.email || '')
    .replace(/\{\{renewalLink\}\}/g, vars.renewalLink || '');
}

export async function GET(request) {
  const denied = await requireAdminOrCronSecret(request);
  if (denied) return denied;
  const dryRun = ['1', 'true'].includes(new URL(request.url).searchParams.get('dryRun') || '');
  const sql = neon(process.env.DATABASE_URL);

  // 1. Candidates + every per-member fact the DB rules need, in one query. All email comparisons
  // are lower(trim()) — app_logs keeps whatever case the browser sent.
  const rows = await sql`
    WITH c AS (
      SELECT LOWER(TRIM(email)) AS email, MIN(ts) AS first_view
      FROM app_logs
      WHERE event = 'renew.page_view'
        AND ts > NOW() - INTERVAL '96 hours' AND ts < NOW() - INTERVAL '24 hours'
        AND email IS NOT NULL AND TRIM(email) <> ''
      GROUP BY 1
    ),
    -- one Neon user per candidate email (prefer a 'current' row if an address has two)
    uu AS (
      SELECT DISTINCT ON (LOWER(email)) LOWER(email) AS email, id, name, migration_type, banned, email_status
      FROM "user" WHERE LOWER(email) IN (SELECT email FROM c)
      ORDER BY LOWER(email), (migration_type = 'current') DESC NULLS LAST
    )
    SELECT c.email, c.first_view,
           u.id AS user_id, u.name, u.migration_type, u.banned, u.email_status,
           EXISTS (SELECT 1 FROM app_logs p WHERE p.event = ANY(${PAID_EVENTS})
                     AND LOWER(TRIM(p.email)) = c.email AND p.ts >= c.first_view) AS paid_since,
           EXISTS (SELECT 1 FROM support_cases sc WHERE sc.status = ANY(${OPEN_CASE_STATUSES})
                     AND (LOWER(sc.from_email) = c.email OR (u.id IS NOT NULL AND sc.user_id = u.id))) AS open_case,
           EXISTS (SELECT 1 FROM outbound_emails o WHERE o.campaign = ${CAMPAIGN}
                     AND LOWER(TRIM(o.to_email)) = c.email AND o.sent_at > NOW() - INTERVAL '30 days') AS sent_recently
    FROM c
    LEFT JOIN uu u ON u.email = c.email
    ORDER BY c.email`;

  const skipped = {};   // rule -> [emails]
  const skip = (rule, email) => { (skipped[rule] ||= []).push(email); };
  const survivors = [];
  for (const r of rows) {
    if (r.paid_since) { skip('paid_since_view', r.email); continue; }
    if (r.migration_type === 'current') { skip('current_in_neon', r.email); continue; }
    if (r.banned) { skip('banned', r.email); continue; }
    if (r.open_case) { skip('open_support_case', r.email); continue; }
    if (r.sent_recently) { skip('sent_this_email_last_30d', r.email); continue; }
    if (r.email_status) { skip('email_status_flagged', r.email); continue; }
    survivors.push(r);
  }
  // 4b. Payment block list — checked only for the members every SQL rule let through.
  const unblocked = [];
  for (const r of survivors) {
    if (await findBlockedIdentity({ email: r.email })) skip('payment_block_list', r.email);
    else unblocked.push(r);
  }

  // 3b. Live Stripe — only for the survivors. A lookup failure skips the member (never mail
  // someone we could not confirm isn't paying).
  // 5 at a time — Stripe's search API is rate-limited.
  const verdicts = new Array(unblocked.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(5, unblocked.length) }, async () => {
    while (next < unblocked.length) {
      const i = next++;
      const r = unblocked[i];
      try {
        const customers = await resolveStripeCustomers(r.email, { userId: r.user_id || undefined });
        const subs = customers.length ? await listSubscriptionsForCustomers(customers) : [];
        const live = subs.find((x) => ACTIVE_STRIPE.includes(x.status));
        verdicts[i] = live ? `stripe_${live.status}` : 'send';
      } catch (err) {
        logger.warn('renewal_outreach.stripe_check_failed', { email: r.email, error: err.message });
        verdicts[i] = 'stripe_check_failed';
      }
    }
  }));
  const toSend = [];
  unblocked.forEach((r, i) => (verdicts[i] === 'send' ? toSend.push(r) : skip(verdicts[i], r.email)));

  const summary = {
    ok: true, dryRun, candidates: rows.length,
    skippedCounts: Object.fromEntries(Object.entries(skipped).map(([k, v]) => [k, v.length])),
    wouldSend: toSend.length,
  };

  if (dryRun) {
    return NextResponse.json({
      ...summary,
      send: toSend.map((r) => ({ email: r.email, greeting: `Hi ${firstName(r.name) || 'there'},` })),
      skipped,
    });
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const results = { sent: 0, errors: 0, emails: [] };
  for (const r of toSend) {
    const renewalLink = `https://app.gymnasticbodies.com/renew?email=${encodeURIComponent(r.email)}`;
    const body = render(BODY, { name: firstName(r.name), email: r.email, renewalLink });
    try {
      await sgMail.send({ to: r.email, from: FROM, replyTo: FROM, subject: SUBJECT, text: body });
      try {
        await sql`INSERT INTO outbound_emails (user_id, to_email, subject, body, campaign, type, sent_at)
                  VALUES (${r.user_id || null}, ${r.email}, ${SUBJECT}, ${body}, ${CAMPAIGN}, ${TYPE}, now())`;
      } catch (err) {
        logger.error('outbound.record_failed', { email: r.email, campaign: CAMPAIGN, error: err.message });
      }
      logger.info('renewal_outreach.auto_sent', { email: r.email, userId: r.user_id || null });
      results.sent++;
      results.emails.push({ email: r.email, status: 'sent' });
    } catch (err) {
      logger.error('renewal_outreach.auto_error', { email: r.email, error: err.message });
      results.errors++;
      results.emails.push({ email: r.email, status: 'error', error: err.message });
    }
  }
  return NextResponse.json({ ...summary, ...results });
}
