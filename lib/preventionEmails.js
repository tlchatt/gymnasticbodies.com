// lib/preventionEmails.js
//
// Email senders for the chargeback-prevention webhook batch
// (app/api/stripe/webhook/route.js): member-facing billing notices +
// internal alerts to support@.
//
// Member-facing copy follows the organizational voice used in outbound
// support mail (see claudePlans/billing-fix-email-copy-2026-07-24.md):
// plain language, no blame, "reply if anything looks wrong", warm sign-off.
//
// Every MEMBER email sent from here is recorded in outbound_emails
// (type 'support', campaign 'system_billing_notice') per the
// do-not-send-unrecorded rule, so a member reply auto-cases via Gmail sync.
// Internal alerts to support@ are deliberately NOT recorded — outbound_emails
// is the member-outreach ledger, and Gmail sync skips @gymnasticbodies.com
// senders anyway.

import sgMail from '@sendgrid/mail';
import { db } from '@/Drizzle/index.ts';
import { outbound_emails } from '@/Drizzle/db/schema';
import { logger } from '@/lib/logger';

const SUPPORT_EMAIL = 'support@gymnasticbodies.com';
const INTERNAL_FROM = 'noreply@gymnasticbodies.com';
const CAMPAIGN = 'system_billing_notice';
const ACCOUNT_HINT = 'My Account → Manage Subscription at https://my.gymnasticbodies.com';

const FOOTER = `Warm regards,
The Gymnastic Bodies Team`;

function greeting(name) {
    return `Hi ${name || 'there'},`;
}

// Sends one member email and records it in outbound_emails. Throws on send
// failure (caller decides how to react); a record failure after a successful
// send is logged loudly but does not un-send the email.
async function sendAndRecordMemberEmail({ toEmail, userId, subject, body }) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
        to: toEmail,
        from: SUPPORT_EMAIL,
        replyTo: SUPPORT_EMAIL,
        subject,
        text: body,
    });
    try {
        await db.insert(outbound_emails).values({
            userId: userId ?? null,
            toEmail,
            subject,
            body,
            campaign: CAMPAIGN,
            type: 'support',
            sentAt: new Date(),
        });
    } catch (err) {
        logger.error('outbound.record_failed', { email: toEmail, subject, campaign: CAMPAIGN, error: err });
    }
    return true;
}

// Member notice: a subscription payment failed. No access change yet —
// just a heads-up plus where to fix the card. Sent at most once per invoice
// (the caller guards via app_logs 'payment_failed.member_notified').
export async function sendPaymentFailedEmail({ toEmail, userId, name, amountUsd }) {
    if (!toEmail) return false;
    const amountPhrase = amountUsd ? ` of $${amountUsd}` : '';
    const subject = "Your Gymnastic Bodies payment didn't go through";
    const body = `${greeting(name)}

A quick note from us: your most recent Gymnastic Bodies payment${amountPhrase} didn't go through. Nothing has changed with your access — this is just a heads-up so it doesn't catch you by surprise.

This is usually something simple, like an expired card or an outdated billing address. You can update your card any time under ${ACCOUNT_HINT}.

If anything about this looks wrong — or you weren't expecting a charge at all — just reply to this email and we'll sort it out right away.

${FOOTER}`;
    try {
        return await sendAndRecordMemberEmail({ toEmail, userId, subject, body });
    } catch (err) {
        logger.error('prevention.payment_failed_email_error', { email: toEmail, error: err });
        return false;
    }
}

// Member notice: an upcoming renewal charge (trial ending, or an annual-sized
// amount). Warns BEFORE the charge so a renewal after months of silence never
// lands as a surprise. renewsOn is a pre-formatted human date string.
export async function sendRenewalReminderEmail({ toEmail, userId, name, amountUsd, renewsOn }) {
    if (!toEmail) return false;
    const amountPhrase = amountUsd ? ` for $${amountUsd}` : '';
    const subject = `Your Gymnastic Bodies membership renews on ${renewsOn}`;
    const body = `${greeting(name)}

A heads-up before anything happens: your Gymnastic Bodies membership renews on ${renewsOn}${amountPhrase}. We know a renewal after a quiet stretch can catch you off guard, so we're reaching out ahead of time — no surprises.

If you're all set, there's nothing you need to do — your access simply continues.

If you'd like to update or remove your payment method, or cancel before the renewal, you can do that under ${ACCOUNT_HINT}.

And if anything looks wrong — the date, the amount, anything at all — just reply to this email and we'll take care of it right away.

${FOOTER}`;
    try {
        return await sendAndRecordMemberEmail({ toEmail, userId, subject, body });
    } catch (err) {
        logger.error('prevention.renewal_reminder_email_error', { email: toEmail, error: err });
        return false;
    }
}

// Internal alert to support@ (disputes, early fraud warnings). Plain text,
// one fact per line. Not recorded in outbound_emails (internal mail).
export async function sendInternalAlertEmail({ subject, lines }) {
    try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send({
            to: SUPPORT_EMAIL,
            from: INTERNAL_FROM,
            replyTo: SUPPORT_EMAIL,
            subject,
            text: Array.isArray(lines) ? lines.join('\n') : String(lines ?? ''),
        });
        return true;
    } catch (err) {
        logger.error('prevention.internal_alert_email_error', { subject, error: err });
        return false;
    }
}
