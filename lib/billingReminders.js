// Billing reminder emails (Greggory, 2026-10-12) — ADMINISTRATIVE notices before a member is charged,
// per Stripe's dispute-prevention guidance. Two separate emails:
//   1. TRIAL    "Your Gymnastic Bodies trial activates tomorrow" — a signup trial that has never been
//               charged, ~1 day before its first charge (hourly run).
//   2. BILLING  "Your next Gymnastic Bodies payment is on {date}" — daily run:
//               monthly  3 days before each charge
//               credit   7 days before billing resumes (trialing sub that has paid before = free time we added)
//               yearly   7 days before the renewal
// Both carry a "Manage my …" button: a passwordless sign-in link (lib/memberSignInLink.js) that lands on
// /accountDetails → Manage Subscription. Recorded in outbound_emails as type 'administrative' (no case;
// a reply becomes a support case through the Gmail sync), with the sign-in link redacted.
//
// Never sent to: subscriptions set to cancel, anything not active/trialing (past_due gets the payment-
// failed notice instead), banned members, blocked payment identities, flagged addresses
// (user.email_status), $0 charges. One per subscription per charge date (app_logs claim).
//
// Sends to members only when BILLING_REMINDERS_LIVE=true — until Greggory approves, every run is a dry run.
import sgMail from '@sendgrid/mail';
import { neon } from '@neondatabase/serverless';
import { stripe, findBlockedIdentity } from '@/lib/stripeServerFunction';
import { recordAdministrativeEmail } from '@/lib/recordOutbound';
import { createSignInLink, SIGN_IN_LINK_HOURS } from '@/lib/memberSignInLink';

let _sql = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));

const HOUR = 3600;
const DAY = 24 * HOUR;
// [earliest, latest] seconds before the charge that a reminder may go out.
const WINDOWS = {
    trial: [2 * HOUR, 26 * HOUR],
    monthly: [12 * HOUR, 3 * DAY],
    credit: [12 * HOUR, 7 * DAY],
    yearly: [12 * HOUR, 7 * DAY],
};
const SENT = 'billing_reminder.sent';
const FROM = 'support@gymnasticbodies.com';
const ACCOUNT_FALLBACK = 'My Account → Manage Subscription at https://my.gymnasticbodies.com';

export const remindersLive = () => process.env.BILLING_REMINDERS_LIVE === 'true';

const parse = (d) => { let x = d; for (let i = 0; i < 2; i++) if (typeof x === 'string') { try { x = JSON.parse(x); } catch { break; } } return x; };
const usd = (cents) => (cents / 100).toFixed(2).replace(/\.00$/, '');
const humanDate = (epoch) => new Date(epoch * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const firstName = (n) => (n && n !== 'N/A' ? String(n).trim().split(/\s+/)[0] : null) || null;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function statementDescriptor() {
    try {
        const acct = await stripe.accounts.retrieve();
        return acct?.settings?.payments?.statement_descriptor || 'GYMFIT LLC';
    } catch { return 'GYMFIT LLC'; }
}

// trial | credit | monthly | yearly, plus the moment the charge happens.
async function classify(sub) {
    const item = sub.items?.data?.[0];
    const interval = item?.price?.recurring?.interval || 'month';
    if (sub.status === 'trialing') {
        const paid = await stripe.invoices.list({ subscription: sub.id, status: 'paid', limit: 10 });
        const type = paid.data.some((i) => i.amount_paid > 0) ? 'credit' : 'trial';
        return { type, interval, chargeAt: sub.trial_end };
    }
    return { type: interval === 'year' ? 'yearly' : 'monthly', interval, chargeAt: item?.current_period_end ?? sub.current_period_end };
}

async function chargeAmountCents(sub) {
    try {
        const preview = await stripe.invoices.createPreview({ subscription: sub.id });
        return preview.amount_due;
    } catch {
        const item = sub.items?.data?.[0];
        return (item?.price?.unit_amount || 0) * (item?.quantity || 1);
    }
}

async function sentKeys() {
    const rows = await db()`SELECT data FROM app_logs WHERE event = ${SENT} AND ts > now() - interval '40 days'`;
    return new Set(rows.map((r) => { const d = parse(r.data); return `${d?.subscriptionId}:${d?.chargeAt}`; }));
}

// Every subscription with a reminder due now for this run, plus who was skipped and why.
export async function findDueReminders({ run }) {
    const types = run === 'trial' ? ['trial'] : ['monthly', 'credit', 'yearly'];
    const statuses = run === 'trial' ? ['trialing'] : ['active', 'trialing'];
    const now = Math.floor(Date.now() / 1000);
    const due = [];
    const skipped = {};
    const skip = (reason, email) => { (skipped[reason] ||= []).push(email); };
    const alreadySent = await sentKeys();

    for (const status of statuses) {
        for await (const sub of stripe.subscriptions.list({ status, limit: 100, expand: ['data.customer'] })) {
            // Cheap time filter before any per-subscription Stripe call.
            const roughCharge = sub.status === 'trialing' ? sub.trial_end : (sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end);
            const until = roughCharge - now;
            const widest = Math.max(...types.map((t) => WINDOWS[t][1]));
            if (!(until > 0 && until <= widest)) continue;

            const { type, interval, chargeAt } = await classify(sub);
            if (!types.includes(type)) continue;
            const [earliest, latest] = WINDOWS[type];
            const left = chargeAt - now;
            if (!(left >= earliest && left <= latest)) continue;

            const email = sub.customer?.email || null;
            if (!email) { skip('no_email', sub.id); continue; }
            if (sub.cancel_at_period_end || sub.cancel_at) { skip('cancelling', email); continue; }
            if (alreadySent.has(`${sub.id}:${chargeAt}`)) { skip('already_sent', email); continue; }
            due.push({ type, interval, chargeAt, sub, email, customerId: sub.customer?.id });
        }
    }

    // Neon + block-list checks only for what is left.
    const out = [];
    for (const d of due) {
        const [u] = await db()`SELECT id, email, name, banned, email_status FROM "user" WHERE lower(email) = ${d.email.toLowerCase()} LIMIT 1`;
        if (u?.banned) { skip('banned', d.email); continue; }
        if (u?.email_status) { skip('email_status_flagged', d.email); continue; }
        if (await findBlockedIdentity({ email: d.email, customerId: d.customerId })) { skip('blocked', d.email); continue; }
        const amountCents = await chargeAmountCents(d.sub);
        if (!(amountCents > 0)) { skip('zero_amount', d.email); continue; }
        out.push({ ...d, amountCents, userId: u?.id || null, accountEmail: u?.email || null, name: firstName(u?.name) || firstName(d.sub.customer?.name) });
    }
    return { due: out, skipped };
}

// Subject / text / html for one reminder. `link` null → no button, account hint instead.
export function renderReminder({ type, interval, name, chargeAt, amountCents, descriptor, link }) {
    const date = humanDate(chargeAt);
    const amount = `$${usd(amountCents)}`;
    const per = interval === 'year' ? 'year' : 'month';
    const isTrial = type === 'trial';
    const subject = isTrial
        ? 'Your Gymnastic Bodies trial activates tomorrow'
        : `Your next Gymnastic Bodies payment is on ${date}`;
    const opening = isTrial
        ? `Just a friendly heads-up: your free trial activates tomorrow, ${date}. Your membership continues at ${amount}/${per}, and the charge will show on your card statement as ${descriptor}.`
        : type === 'credit'
            ? `Just a friendly heads-up: the free time we added to your membership wraps up soon, and your regular payment of ${amount}/${per} starts again on ${date}. It will show on your card statement as ${descriptor}.`
            : `Just a friendly heads-up: your next Gymnastic Bodies payment of ${amount} is on ${date}. It will show on your card statement as ${descriptor}.`;
    const button = isTrial ? 'Manage my trial' : 'Manage my subscription';
    const linkNote = `That button signs you straight into your account. You can update your card or plan, or cancel, from there. (The link works for ${SIGN_IN_LINK_HOURS / 24} days, so please don't forward this email.)`;
    const noLinkNote = `You can update your card or plan, or cancel, any time under ${ACCOUNT_FALLBACK}.`;
    const closing = isTrial ? 'Questions? Just reply to this email.' : "If anything looks off, just reply and we'll sort it out.";
    const greeting = `Hi ${name || 'there'},`;
    const signOff = ['Warm regards,', 'The Gymnastic Bodies Team'];

    const text = [
        greeting, '', opening, '', "There's nothing you need to do. Keep training!", '',
        ...(link ? [`${button}: ${link}`, '', linkNote] : [noLinkNote]),
        '', closing, '', ...signOff,
    ].join('\n');

    const p = (s) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;color:#222">${esc(s)}</p>`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px">
${p(greeting)}
${p(opening)}
${p("There's nothing you need to do. Keep training!")}
${link
        ? `<p style="margin:0 0 16px"><a href="${esc(link)}" style="display:inline-block;padding:12px 24px;border-radius:6px;background:#c2410c;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none">${esc(button)}</a></p>
${p(linkNote)}`
        : p(noLinkNote)}
${p(closing)}
<p style="margin:0;font-size:16px;line-height:1.5;color:#222">${esc(signOff[0])}<br>${esc(signOff[1])}</p>
</div>`;
    return { subject, text, html };
}

async function sendOne({ to, userId, campaign, rendered, link }) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
        to, from: FROM, replyTo: FROM,
        subject: rendered.subject, text: rendered.text, html: rendered.html,
        // The sign-in link must not be rewritten through (or stored at) a tracking redirect.
        trackingSettings: { clickTracking: { enable: false, enableText: false } },
    });
    const body = link ? rendered.text.split(link).join('[sign-in link]') : rendered.text;
    await recordAdministrativeEmail({ toEmail: to, subject: rendered.subject, body, campaign, userId });
}

// One run. Sends only when BILLING_REMINDERS_LIVE=true and dryRun is false.
export async function runReminders({ run, dryRun }) {
    const live = remindersLive() && !dryRun;
    const { due, skipped } = await findDueReminders({ run });
    const descriptor = await statementDescriptor();
    const results = [];
    for (const d of due) {
        const row = { email: d.email, type: d.type, chargeDate: humanDate(d.chargeAt), amount: usd(d.amountCents), subscriptionId: d.sub.id, hasAccount: !!d.accountEmail };
        if (!live) { results.push({ ...row, status: 'would_send' }); continue; }
        // Claim first so an overlapping run can't send it twice; drop the claim if the send fails.
        const [claim] = await db()`INSERT INTO app_logs (level, event, email, user_id, source, data)
            VALUES ('info', ${SENT}, ${d.email}, ${d.userId}, 'app.gymnasticbodies.com', ${JSON.stringify({ subscriptionId: d.sub.id, chargeAt: d.chargeAt, type: d.type, amount: d.amountCents })}::json) RETURNING id`;
        try {
            const link = d.accountEmail ? await createSignInLink(d.accountEmail) : null;
            const rendered = renderReminder({ ...d, descriptor, link });
            await sendOne({ to: d.email, userId: d.userId, campaign: d.type === 'trial' ? 'billing_reminder_trial' : 'billing_reminder', rendered, link });
            results.push({ ...row, status: 'sent', withLink: !!link });
        } catch (err) {
            await db()`DELETE FROM app_logs WHERE id = ${claim.id}`;
            results.push({ ...row, status: 'failed', error: err?.message });
        }
    }
    const skippedCounts = Object.fromEntries(Object.entries(skipped).map(([k, v]) => [k, v.length]));
    return { run, live, gate: remindersLive() ? 'on' : 'off', due: results.length, skipped: skippedCounts, skippedDetail: skipped, results };
}

// ONE test email to a named address, with sample charge values and a real sign-in link for that
// address's own account. Ignores the gate. Not counted as a member reminder (no claim).
// preview: return the rendered email (and its live link) instead of sending it.
export async function sendTestReminder({ to, type, preview = false }) {
    const now = Math.floor(Date.now() / 1000);
    const [u] = await db()`SELECT id, email, name FROM "user" WHERE lower(email) = ${String(to).toLowerCase()} LIMIT 1`;
    const link = u ? await createSignInLink(u.email) : null;
    const rendered = renderReminder({
        type, interval: type === 'yearly' ? 'year' : 'month', name: firstName(u?.name),
        chargeAt: now + (type === 'trial' ? DAY : type === 'monthly' ? 3 * DAY : 7 * DAY),
        amountCents: type === 'yearly' ? 17988 : 5000, descriptor: await statementDescriptor(), link,
    });
    if (preview) return { to, type, preview: true, ...rendered, link };
    await sendOne({ to, userId: u?.id || null, campaign: 'billing_reminder_test', rendered, link });
    return { to, type, subject: rendered.subject, withLink: !!link };
}
