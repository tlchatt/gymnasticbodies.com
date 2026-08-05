import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripeServerFunction';
import {
    getUserSettingByStripeSubscriptionId,
    updateUserSettingStatus,
    updateUserSettingData,
    updateUserClassification,
    getUserWithEmail,
    getUserWithId,
} from '@/lib/userSettings';
import { sendSubsCancelledEmailSG } from '@/lib/sendgrid';
import {
    sendPaymentFailedEmail,
    sendRenewalReminderEmail,
    sendInternalAlertEmail,
} from '@/lib/preventionEmails';
import { logger } from '@/lib/logger';
import { db } from '@/Drizzle/index.ts';
import { app_logs, support_cases, user_setting } from '@/Drizzle/db/schema';
import { and, eq, desc } from 'drizzle-orm';

export async function POST(request) {
    const sig = request.headers.get('stripe-signature');
    const body = await request.text();

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        logger.error('webhook.sig_failed', { error: err });
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // -----------------------------------------------------------------------
    // Chargeback-prevention events (2026-08-03). Handled BEFORE the
    // subscription-keyed lookup below because their payloads are charge-keyed
    // (dispute / early fraud warning) or have no invoice id yet
    // (invoice.upcoming) — the generic subscription lookup would mismatch.
    // Each handler is fully isolated: a failure here must NEVER break existing
    // webhook processing, and Stripe always gets a 200 ack.
    // -----------------------------------------------------------------------
    const preventionHandlers = {
        'charge.dispute.created': handleDisputeCreated,
        'radar.early_fraud_warning.created': handleEarlyFraudWarning,
        'invoice.upcoming': handleInvoiceUpcoming,
    };
    if (preventionHandlers[event.type]) {
        try {
            logger.info('webhook.received', { eventType: event.type });
            await preventionHandlers[event.type](event.data.object);
        } catch (err) {
            logger.error('webhook.prevention_error', { eventType: event.type, error: err });
        }
        return NextResponse.json({ received: true }, { status: 200 });
    }

    try {
        // invoice events have .subscription; subscription events have .id
        const subscriptionId = event.data.object.subscription ?? event.data.object.id;
        logger.info('webhook.received', { eventType: event.type, subscriptionId });

        const userSetting = await getUserSettingByStripeSubscriptionId(subscriptionId);

        if (!userSetting) {
            logger.warn('webhook.unmatched', { eventType: event.type, subscriptionId });
            return NextResponse.json({ received: true }, { status: 200 });
        }

        const currentData = JSON.parse(userSetting.data ?? '{}');

        switch (event.type) {
            case 'invoice.payment_succeeded': {
                const periodEnd = new Date(event.data.object.period_end * 1000);
                await updateUserSettingData(userSetting, JSON.stringify({
                    ...currentData,
                    renewaldate: periodEnd.toISOString(),
                    status: 'active',
                }));
                logger.info('webhook.processed', { eventType: event.type, subscriptionId, settingId: userSetting.id });

                // trial.converted telemetry — first non-zero invoice after a trial.
                // Isolated: telemetry failure must not affect the renewal-date write above.
                try {
                    await recordTrialConversion(event.data.object, userSetting, currentData);
                } catch (err) {
                    logger.error('webhook.trial_converted_error', { subscriptionId, error: err });
                }
                break;
            }

            case 'customer.subscription.deleted': {
                if (userSetting.status !== 'cancelled') {
                    await updateUserSettingStatus(userSetting, 'cancelled', JSON.stringify({
                        ...currentData,
                        status: 'cancelled',
                    }));
                    const email = currentData?.email;
                    if (email) await sendSubsCancelledEmailSG(email);
                }
                await updateUserClassification(userSetting.userId, 'noncurrent', 'lapsed');
                logger.info('webhook.processed', { eventType: event.type, subscriptionId, settingId: userSetting.id });
                break;
            }

            case 'invoice.payment_failed': {
                await updateUserSettingStatus(userSetting, 'inactive', JSON.stringify({
                    ...currentData,
                    status: 'inactive',
                }));
                await updateUserClassification(userSetting.userId, 'noncurrent', 'lapsed');
                logger.info('webhook.processed', { eventType: event.type, subscriptionId, settingId: userSetting.id });

                // Member heads-up email (once per invoice). Isolated: a notify
                // failure must not affect the status writes above.
                try {
                    await notifyMemberPaymentFailed(event.data.object, userSetting, currentData);
                } catch (err) {
                    logger.error('webhook.payment_failed_notify_error', { subscriptionId, error: err });
                }
                break;
            }

            default:
                break;
        }
    } catch (err) {
        logger.error('webhook.handler_error', { eventType: event.type, error: err });
        // Still return 200 so Stripe doesn't keep retrying for internal errors
    }

    return NextResponse.json({ received: true }, { status: 200 });
}

// ---------------------------------------------------------------------------
// Chargeback-prevention helpers
// ---------------------------------------------------------------------------

// $ amount from Stripe cents: 5000 -> "50", 17988 -> "179.88".
function formatUsd(cents) {
    if (cents == null || Number.isNaN(Number(cents))) return null;
    const usd = Number(cents) / 100;
    return Number.isInteger(usd) ? String(usd) : usd.toFixed(2);
}

function formatHumanDate(epochSeconds) {
    if (!epochSeconds) return null;
    return new Date(epochSeconds * 1000).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
}

function firstName(fullName) {
    if (!fullName || fullName === 'N/A') return null;
    return fullName.trim().split(/\s+/)[0];
}

// Durable app_logs write for guard/telemetry events. logger.info inserts
// fire-and-forget — fine for diagnostics, but dedup guards
// (payment_failed.member_notified / renewal_reminder.sent / trial.converted)
// must be committed before we ack Stripe, so these are awaited direct inserts.
async function logDurable(eventName, { email, userId, ...data }) {
    const entry = { ts: new Date().toISOString(), level: 'info', event: eventName, ...(email && { email }), ...data };
    console.log(JSON.stringify(entry));
    await db.insert(app_logs).values({
        level: 'info',
        event: eventName,
        email: email ?? null,
        userId: userId ?? null,
        source: 'app.gymnasticbodies.com',
        data: Object.keys(data).length > 0 ? data : null,
    });
}

// Has an app_logs row for eventName (optionally scoped to email — indexed)
// whose json data matches the predicate? app_logs.data is a json column:
// per project rule, fetch candidate rows and filter in JS — never ->> in
// parameterized neon queries.
async function hasPriorLog(eventName, email, matches) {
    const conditions = [eq(app_logs.event, eventName)];
    if (email) conditions.push(eq(app_logs.email, email));
    const rows = await db
        .select({ data: app_logs.data })
        .from(app_logs)
        .where(and(...conditions))
        .orderBy(desc(app_logs.ts))
        .limit(500);
    return rows.some((r) => {
        try { return matches(r.data ?? {}); } catch { return false; }
    });
}

// Resolve a Stripe charge's customer to our member: user_setting by
// stripe_customer_id first, email fallback second. Never throws.
async function resolveMember({ customerId, email }) {
    let userId = null;
    let resolvedEmail = email ?? null;
    let name = null;
    try {
        if (customerId) {
            const [setting] = await db
                .select()
                .from(user_setting)
                .where(eq(user_setting.stripeCustomerId, customerId))
                .limit(1);
            if (setting) {
                userId = setting.userId;
                try {
                    const d = JSON.parse(setting.data ?? '{}');
                    if (!resolvedEmail && d?.email && d.email !== 'N/A') resolvedEmail = d.email;
                } catch { /* data blob unreadable — keep going */ }
            }
        }
        if (userId) {
            const u = await getUserWithId(userId);
            if (u) {
                name = u.name;
                if (!resolvedEmail) resolvedEmail = u.email;
            }
        } else if (resolvedEmail) {
            const u = await getUserWithEmail(resolvedEmail);
            if (u) {
                userId = u.id;
                name = u.name;
                resolvedEmail = u.email;
            }
        }
    } catch (err) {
        logger.error('prevention.resolve_member_error', { customerId, email, error: err });
    }
    return { userId, email: resolvedEmail, name };
}

// Standalone high-priority support case for disputes / fraud warnings.
// (These are customer-originated risk events, not admin actions — the
// no-standalone-case rule in lib/adminSubscription.js does not apply.)
async function createPreventionCase({ userId, fromEmail, fromName, title, adminNotes }) {
    const rows = await db.insert(support_cases).values({
        userId: userId ?? null,
        fromEmail: fromEmail || 'unknown',
        fromName: fromName ?? null,
        title,
        status: 'open',
        priority: 'high',
        adminNotes,
    }).returning({ id: support_cases.id });
    return rows?.[0]?.id ?? null;
}

// charge.dispute.created — a member filed a chargeback.
//  (a) Never-rebill policy: detach ALL card payment methods for the customer
//      and clear their default payment method, so no future cycle can charge
//      a disputing cardholder again (repeat charges are how dispute counts
//      snowball past network thresholds).
//  (b) High-priority support case so the dispute gets worked before the
//      evidence deadline (3 were lost by default in July because nothing
//      watched them).
//  (c) Internal alert email to support@.
//  (d) app_logs 'dispute.created'.
// NOTE (Stripe dashboard): charge.dispute.created must be enabled for the
// webhook endpoint (Developers → Webhooks → app.gymnasticbodies.com/api/stripe/webhook).
async function handleDisputeCreated(dispute) {
    const disputeId = dispute.id;
    const chargeId = dispute.charge ?? null;
    const amountUsd = formatUsd(dispute.amount);
    const reason = dispute.reason ?? 'unknown';
    const evidenceDueBy = formatHumanDate(dispute.evidence_details?.due_by) ?? 'unknown';

    let charge = null;
    try {
        if (chargeId) charge = await stripe.charges.retrieve(chargeId);
    } catch (err) {
        logger.error('dispute.charge_lookup_failed', { disputeId, chargeId, error: err });
    }
    const customerId = charge?.customer ?? null;
    const chargeEmail = charge?.billing_details?.email ?? charge?.receipt_email ?? null;

    // (a) Detach every card + clear the default payment method.
    let cardsDetached = 0;
    let detachError = null;
    if (customerId) {
        try {
            const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 100 });
            for (const pm of pms.data ?? []) {
                await stripe.paymentMethods.detach(pm.id);
                cardsDetached++;
            }
            // Empty string unsets invoice_settings.default_payment_method.
            await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: '' } });
        } catch (err) {
            detachError = err?.message ?? String(err);
            logger.error('dispute.detach_failed', { disputeId, customerId, cardsDetached, error: err });
        }
    }

    const member = await resolveMember({ customerId, email: chargeEmail });

    // (b) Support case.
    const title = `CHARGEBACK — ${reason} — $${amountUsd ?? '?'}`;
    const adminNotes = [
        `Stripe dispute: ${disputeId}`,
        `Charge: ${chargeId ?? 'unknown'}`,
        `Amount: $${amountUsd ?? 'unknown'}`,
        `Reason: ${reason}`,
        `Evidence due: ${evidenceDueBy}`,
        `Customer: ${member.email ?? 'unknown'} (Stripe ${customerId ?? 'unknown'})`,
        `Policy: all card payment methods were detached and the default payment method cleared (never-rebill a disputing cardholder). Cards detached: ${cardsDetached}${detachError ? ` — DETACH FAILED: ${detachError} (detach manually in Stripe)` : ''}.`,
        `Action needed: submit evidence in Stripe before the deadline, or accept the dispute — do not leave it to expire by default.`,
    ].join('\n');
    let caseId = null;
    try {
        caseId = await createPreventionCase({
            userId: member.userId,
            fromEmail: member.email,
            fromName: member.name,
            title,
            adminNotes,
        });
    } catch (err) {
        logger.error('dispute.case_create_failed', { disputeId, error: err });
    }

    // (c) Internal alert.
    await sendInternalAlertEmail({
        subject: `Chargeback filed: $${amountUsd ?? '?'} ${reason} ${member.email ?? 'unknown'}`,
        lines: [
            `A chargeback was filed against Gymnastic Bodies.`,
            ``,
            `Member: ${member.email ?? 'unknown'}${member.name ? ` (${member.name})` : ''}`,
            `Amount: $${amountUsd ?? 'unknown'}`,
            `Reason: ${reason}`,
            `Evidence due: ${evidenceDueBy}`,
            `Dispute: ${disputeId}`,
            `Charge: ${chargeId ?? 'unknown'}`,
            `Stripe customer: ${customerId ?? 'unknown'}`,
            ``,
            `Cards detached (never-rebill policy): ${cardsDetached}${detachError ? ` — DETACH FAILED: ${detachError}` : ''}`,
            caseId ? `Support case: #${caseId} (https://app.gymnasticbodies.com/admin/cases/${caseId})` : `Support case: creation FAILED — open one manually.`,
            ``,
            `Respond in Stripe before the evidence deadline — disputes left alone are lost by default.`,
        ],
    });

    // (d) Telemetry.
    await logDurable('dispute.created', {
        email: member.email,
        userId: member.userId,
        disputeId,
        chargeId,
        amount: dispute.amount ?? null,
        reason,
        evidenceDueBy,
        cardsDetached,
        ...(detachError && { detachError }),
        caseId,
    });
}

// radar.early_fraud_warning.created — the card network flagged a charge as
// likely fraud BEFORE a formal dispute. No automatic refund (owner decides),
// but refunding fast prevents the chargeback from ever counting against our
// dispute rate — so this raises the same alert + high-priority case shape as
// a dispute, with that guidance in the notes.
// NOTE (Stripe dashboard): radar.early_fraud_warning.created must be enabled
// for the webhook endpoint.
async function handleEarlyFraudWarning(efw) {
    const efwId = efw.id;
    const chargeId = efw.charge ?? null;
    const fraudType = efw.fraud_type ?? 'unknown';

    let charge = null;
    try {
        if (chargeId) charge = await stripe.charges.retrieve(chargeId);
    } catch (err) {
        logger.error('efw.charge_lookup_failed', { efwId, chargeId, error: err });
    }
    const customerId = charge?.customer ?? null;
    const chargeEmail = charge?.billing_details?.email ?? charge?.receipt_email ?? null;
    const amountUsd = formatUsd(charge?.amount);
    const alreadyRefunded = charge?.refunded === true;

    const member = await resolveMember({ customerId, email: chargeEmail });

    const title = `EARLY FRAUD WARNING — ${fraudType} — $${amountUsd ?? '?'}`;
    const adminNotes = [
        `Stripe early fraud warning: ${efwId}`,
        `Charge: ${chargeId ?? 'unknown'}`,
        `Amount: $${amountUsd ?? 'unknown'}`,
        `Fraud type: ${fraudType}`,
        `Actionable: ${efw.actionable === false ? 'no' : 'yes'}`,
        `Already refunded: ${alreadyRefunded ? 'yes' : 'no'}`,
        `Customer: ${member.email ?? 'unknown'} (Stripe ${customerId ?? 'unknown'})`,
        `No automatic refund was taken — owner decides. If refunding: refund fast to prevent the chargeback from counting against the dispute rate (a refund before the dispute lands keeps it off the network count).`,
    ].join('\n');
    let caseId = null;
    try {
        caseId = await createPreventionCase({
            userId: member.userId,
            fromEmail: member.email,
            fromName: member.name,
            title,
            adminNotes,
        });
    } catch (err) {
        logger.error('efw.case_create_failed', { efwId, error: err });
    }

    await sendInternalAlertEmail({
        subject: `Early fraud warning: $${amountUsd ?? '?'} ${fraudType} ${member.email ?? 'unknown'}`,
        lines: [
            `Stripe Radar flagged a charge as likely fraud (early fraud warning).`,
            ``,
            `Member: ${member.email ?? 'unknown'}${member.name ? ` (${member.name})` : ''}`,
            `Amount: $${amountUsd ?? 'unknown'}`,
            `Fraud type: ${fraudType}`,
            `EFW: ${efwId}`,
            `Charge: ${chargeId ?? 'unknown'}`,
            `Stripe customer: ${customerId ?? 'unknown'}`,
            `Already refunded: ${alreadyRefunded ? 'yes' : 'no'}`,
            ``,
            `No auto-refund was taken — your call. If you refund, refund fast: a refund issued before the dispute arrives prevents the chargeback from counting.`,
            caseId ? `Support case: #${caseId} (https://app.gymnasticbodies.com/admin/cases/${caseId})` : `Support case: creation FAILED — open one manually.`,
        ],
    });

    await logDurable('efw.created', {
        email: member.email,
        userId: member.userId,
        efwId,
        chargeId,
        amount: charge?.amount ?? null,
        fraudType,
        actionable: efw.actionable ?? null,
        alreadyRefunded,
        caseId,
    });
}

// invoice.upcoming — Stripe's advance notice before a renewal charge.
// We email the member ahead of the charge when (a) the subscription is coming
// off a trial (covers the ~22 goodwill-credit members whose billing resumes
// Oct 28 – Dec 9 via trial_end pushes — months of silence then a charge is a
// dispute factory) or (b) the amount is annual-sized (>= $100).
//
// NOTE (Stripe dashboard — REQUIRED for this handler to ever fire):
//   1. Add 'invoice.upcoming' to the webhook endpoint's enabled events
//      (Developers → Webhooks → app.gymnasticbodies.com/api/stripe/webhook).
//   2. Settings → Billing → Subscriptions and emails → set "Upcoming renewal
//      events" lookahead (default 3 days; 30 days recommended so members get
//      real notice before trial-end billing resumes).
async function handleInvoiceUpcoming(invoice) {
    // .parent.subscription_details is where newer Stripe API versions moved
    // invoice.subscription — the endpoint's pinned version still sends the
    // flat field (the main flow depends on it), this is just a fallback.
    const subscriptionId = invoice.subscription
        ?? invoice.parent?.subscription_details?.subscription
        ?? null;
    const amountCents = invoice.amount_due ?? 0;
    if (!subscriptionId || amountCents <= 0) return;

    let sub = null;
    try {
        sub = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (err) {
        logger.error('renewal_reminder.sub_lookup_failed', { subscriptionId, error: err });
    }

    // Coming off trial: the sub has a trial_end that is still ahead of us (or
    // within the last day — clock skew between Stripe emitting and us
    // processing). invoice.upcoming only fires inside the dashboard-configured
    // lookahead window, so a future trial_end here means "billing is about to
    // start for the first time".
    const DAY_MS = 24 * 60 * 60 * 1000;
    const comingOffTrial = !!(sub?.trial_end && sub.trial_end * 1000 > Date.now() - DAY_MS);
    const annualSized = amountCents >= 10000; // >= $100
    if (!comingOffTrial && !annualSized) return;

    // Resolve the member. Upcoming invoices have no id yet, so everything is
    // keyed on subscription + billing period below.
    const userSetting = await getUserSettingByStripeSubscriptionId(subscriptionId);
    let currentData = {};
    try { currentData = JSON.parse(userSetting?.data ?? '{}'); } catch { currentData = {}; }
    const email = invoice.customer_email
        ?? (currentData?.email && currentData.email !== 'N/A' ? currentData.email : null);
    let name = firstName(currentData?.first_name);
    if (userSetting?.userId && !name) {
        try {
            const u = await getUserWithId(userSetting.userId);
            name = firstName(u?.name);
        } catch { /* name is cosmetic */ }
    }
    if (!email) {
        logger.warn('renewal_reminder.no_email', { subscriptionId });
        return;
    }

    // Dedup per invoice period: Stripe can emit invoice.upcoming more than
    // once inside one lookahead window, and there is no invoice id yet — key
    // on subscription + period.
    const periodKey = invoice.period_end ?? invoice.next_payment_attempt ?? null;
    const already = await hasPriorLog('renewal_reminder.sent', email, (d) =>
        d.subscriptionId === subscriptionId && String(d.periodKey) === String(periodKey));
    if (already) return;

    const renewsOnEpoch = invoice.next_payment_attempt ?? sub?.trial_end ?? invoice.period_end ?? null;
    const renewsOn = formatHumanDate(renewsOnEpoch) ?? 'your next billing date';
    const amountUsd = formatUsd(amountCents);

    const sent = await sendRenewalReminderEmail({
        toEmail: email,
        userId: userSetting?.userId ?? null,
        name,
        amountUsd,
        renewsOn,
    });
    if (!sent) return; // send failed (already logged) — leave no guard row so a retry can succeed

    await logDurable('renewal_reminder.sent', {
        email,
        userId: userSetting?.userId ?? null,
        subscriptionId,
        periodKey,
        amount: amountCents,
        renewsOn,
        trigger: comingOffTrial ? 'trial_end' : 'annual_amount',
    });
}

// invoice.payment_failed extension — plain heads-up email to the member,
// at most ONCE per invoice (guarded via app_logs 'payment_failed.member_notified';
// Stripe retries the same invoice several times over days and each retry
// re-fires the event).
async function notifyMemberPaymentFailed(invoice, userSetting, currentData) {
    const invoiceId = invoice.id ?? null;
    const subscriptionId = invoice.subscription ?? null;
    const email = invoice.customer_email
        ?? (currentData?.email && currentData.email !== 'N/A' ? currentData.email : null);
    if (!email) {
        logger.warn('payment_failed.no_email', { invoiceId, subscriptionId });
        return;
    }

    if (invoiceId) {
        const already = await hasPriorLog('payment_failed.member_notified', email, (d) => d.invoiceId === invoiceId);
        if (already) return;
    }

    let name = firstName(currentData?.first_name);
    if (!name && userSetting?.userId) {
        try {
            const u = await getUserWithId(userSetting.userId);
            name = firstName(u?.name);
        } catch { /* name is cosmetic */ }
    }

    const sent = await sendPaymentFailedEmail({
        toEmail: email,
        userId: userSetting?.userId ?? null,
        name,
        amountUsd: formatUsd(invoice.amount_due),
    });
    if (!sent) return; // send failed (already logged) — no guard row, so a later retry can notify

    await logDurable('payment_failed.member_notified', {
        email,
        userId: userSetting?.userId ?? null,
        invoiceId,
        subscriptionId,
        amount: invoice.amount_due ?? null,
    });
}

// invoice.payment_succeeded extension — 'trial.converted' telemetry.
// Logged once per subscription, on its first non-zero invoice after a trial
// (sub.trial_end exists, invoice.period_start >= trial_end, amount paid > 0).
// Makes trial conversion queryable locally for /admin analytics.
async function recordTrialConversion(invoice, userSetting, currentData) {
    const subscriptionId = invoice.subscription ?? null;
    const amountPaid = invoice.amount_paid ?? 0;
    if (!subscriptionId || amountPaid <= 0) return;

    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    if (!sub?.trial_end) return; // never had a trial — nothing to convert
    if (!(invoice.period_start >= sub.trial_end)) return; // still inside the trial period

    const email = invoice.customer_email
        ?? (currentData?.email && currentData.email !== 'N/A' ? currentData.email : null);
    const already = await hasPriorLog('trial.converted', email, (d) => d.subscriptionId === subscriptionId);
    if (already) return;

    await logDurable('trial.converted', {
        email,
        userId: userSetting?.userId ?? null,
        subscriptionId,
        amount: amountPaid / 100,
    });
}
