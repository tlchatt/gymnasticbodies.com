import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { db } from '@/Drizzle/index.ts';
import { outbound_emails, user } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/logger';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const CAMPAIGN = 'renewal_auto_drip';
const SUBJECT = 'Having trouble renewing your GymFit membership?';
const BODY = `Hi {{name}},

We noticed you recently visited our renewal page but didn't complete the process.

If you ran into any issues — whether it's a question about pricing, a payment problem, or anything else — just reply to this email and we'll help you out.

Your renewal link: {{renewalLink}}

— The GymFit Team`;

function firstName(fullName) {
  if (!fullName || fullName === 'N/A') return null;
  return fullName.trim().split(/\s+/)[0];
}

function render(template, vars) {
  return template
    .replace(/\{\{name\}\}/g, vars.name || '')
    .replace(/\{\{email\}\}/g, vars.email || '')
    .replace(/\{\{renewalLink\}\}/g, vars.renewalLink || '');
}

export async function GET(request) {
  const sql = neon(process.env.DATABASE_URL);

  // Find qualifying drop-offs:
  // - visited /renew 24–96 hours ago
  // - never converted
  // - not in an active support conversation (no inbound support email in last 30 days)
  // - not already sent this automated email in the last 30 days
  //
  // All email comparisons are normalized with LOWER(TRIM(...)). app_logs stores
  // whatever case the client submitted (e.g. iOS auto-capitalizes the email
  // field, logging "Sumantis@mac.com"), while support_emails/outbound_emails
  // store the lowercased address. Postgres IN is case-sensitive, so without
  // this normalization a mixed-case log row silently dodges every suppression
  // guard and the person gets dripped daily instead of once. Subqueries also
  // guard IS NOT NULL because NOT IN over a NULL-containing set matches nothing.
  const candidates = await sql`
    SELECT DISTINCT LOWER(TRIM(l.email)) AS email
    FROM app_logs l
    WHERE l.event = 'renew.page_view'
      AND l.ts > NOW() - INTERVAL '96 hours'
      AND l.ts < NOW() - INTERVAL '24 hours'
      AND l.email IS NOT NULL
      AND TRIM(l.email) <> ''
      AND LOWER(TRIM(l.email)) NOT IN (
        SELECT LOWER(TRIM(email)) FROM app_logs
        WHERE event = 'renewal.success' AND email IS NOT NULL
      )
      AND LOWER(TRIM(l.email)) NOT IN (
        SELECT LOWER(TRIM(from_email)) FROM support_emails
        WHERE received_at > NOW() - INTERVAL '30 days' AND from_email IS NOT NULL
      )
      AND LOWER(TRIM(l.email)) NOT IN (
        SELECT LOWER(TRIM(to_email)) FROM outbound_emails
        WHERE sent_at > NOW() - INTERVAL '30 days' AND to_email IS NOT NULL
      )
  `;

  const results = { sent: 0, skipped: 0, errors: 0, emails: [] };

  for (const row of candidates) {
    const email = row.email.trim().toLowerCase();

    const [u] = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    const name = firstName(u?.name);
    const renewalLink = `https://app.gymnasticbodies.com/renew?email=${encodeURIComponent(email)}`;
    const renderedBody = render(BODY, { name: name || '', email, renewalLink });

    try {
      await sgMail.send({
        to: email,
        from: 'support@gymnasticbodies.com',
        replyTo: 'support@gymnasticbodies.com',
        subject: SUBJECT,
        text: renderedBody,
      });

      await db.insert(outbound_emails).values({
        userId: u?.id ?? null,
        toEmail: email,
        subject: SUBJECT,
        body: renderedBody,
        campaign: CAMPAIGN,
        type: 'support',
        sentAt: new Date(),
      });

      logger.info('renewal_outreach.auto_sent', { email, userId: u?.id ?? null });
      results.sent++;
      results.emails.push({ email, status: 'sent' });
    } catch (err) {
      logger.error('renewal_outreach.auto_error', { email, error: err.message });
      results.errors++;
      results.emails.push({ email, status: 'error', error: err.message });
    }
  }

  results.skipped = candidates.length - results.sent - results.errors;

  return NextResponse.json({ ok: true, ...results });
}
