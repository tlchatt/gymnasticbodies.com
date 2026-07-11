import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_cases, support_emails, support_replies, user, user_setting, app_logs, session, outbound_emails } from '@/Drizzle/db/schema';
import { eq, desc, and, ne, inArray, like } from 'drizzle-orm';
import { stripe } from '@/lib/stripeServerFunction';

// Builds a human-readable subscription summary for the case customer panel:
// what they pay, where their access comes from, live Stripe status, and
// whether they converted from a marketing offer.
async function buildSubscriptionSummary(setting, userId) {
  if (!setting) return null;

  let data = {};
  try { data = typeof setting.data === 'string' ? JSON.parse(setting.data || '{}') : (setting.data ?? {}); }
  catch { data = {}; }

  const isStripe = !!setting.stripeSubscriptionId;
  const isAuthNet = !!setting.authorizeSubscriptionId;

  let stripeLive = null;
  if (isStripe) {
    try {
      const sub = await stripe.subscriptions.retrieve(setting.stripeSubscriptionId, { expand: ['items.data.price'] });
      const item = sub.items?.data?.[0];
      const price = item?.price;
      const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;
      stripeLive = {
        status: sub.status,
        amount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        interval: price?.recurring?.interval ?? null,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      };
    } catch { stripeLive = { error: true }; }
  }

  // Did they convert from a marketing offer?
  let offerConversion = null;
  const conv = await db
    .select({ ts: app_logs.ts, data: app_logs.data })
    .from(app_logs)
    .where(and(eq(app_logs.userId, userId), eq(app_logs.event, 'offer.success')))
    .orderBy(desc(app_logs.ts))
    .limit(1);
  if (conv.length) {
    const d = conv[0].data || {};
    offerConversion = { slug: d.slug ?? null, price: d.price ?? null, term: d.term ?? null, at: conv[0].ts };
  }

  const accessSource = isStripe ? 'stripe' : isAuthNet ? 'auth_net' : (data.renewaldate ? 'legacy_renewaldate' : 'unknown');

  return {
    accessSource,
    isStripe,
    isAuthNet,
    productName: data.productName ?? null,
    price: data.price ?? null,
    term: data.term ?? null,
    paymentMethod: data.payment_method ?? null,
    startDate: data.startdate ?? null,
    renewalDate: data.renewaldate ?? null,
    settingStatus: setting.status ?? data.status ?? null,
    stripeLive,
    offerConversion,
  };
}

export async function GET(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const caseId = parseInt(id);
  if (isNaN(caseId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const [caseRow] = await db
    .select()
    .from(support_cases)
    .where(eq(support_cases.id, caseId));

  if (!caseRow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Linked emails (with body)
  const linkedEmails = await db
    .select({
      id: support_emails.id,
      subject: support_emails.subject,
      fromEmail: support_emails.fromEmail,
      fromName: support_emails.fromName,
      body: support_emails.body,
      receivedAt: support_emails.receivedAt,
      status: support_emails.status,
    })
    .from(support_emails)
    .where(eq(support_emails.caseId, caseId))
    .orderBy(desc(support_emails.receivedAt));

  // Replies for all linked emails
  const emailIds = linkedEmails.map(e => e.id);
  const replies = emailIds.length > 0
    ? await db
        .select({
          id: support_replies.id,
          emailId: support_replies.emailId,
          body: support_replies.body,
          sentAt: support_replies.sentAt,
        })
        .from(support_replies)
        .where(inArray(support_replies.emailId, emailIds))
        .orderBy(support_replies.sentAt)
    : [];

  // Attach replies to their parent emails
  const repliesByEmail = replies.reduce((acc, r) => {
    (acc[r.emailId] ??= []).push(r);
    return acc;
  }, {});
  const linkedEmailsWithReplies = linkedEmails.map(e => ({
    ...e,
    replies: repliesByEmail[e.id] ?? [],
  }));

  let matchedUser = null;
  let setting = null;
  let lastSession = null;
  let recentLogs = [];
  let adminActions = [];
  let outbound = [];
  let pastCases = [];

  if (caseRow.userId) {
    const [u] = await db.select().from(user).where(eq(user.id, caseRow.userId));
    matchedUser = u ?? null;

    if (matchedUser) {
      const settings = await db.select().from(user_setting).where(eq(user_setting.userId, caseRow.userId));
      // Prefer the subscription row — a user can also have a levelPath row, and
      // all the Stripe/Auth.net fields live on the subscription row.
      setting = settings.find((x) => x.type === 'subscription') ?? settings[0] ?? null;

      recentLogs = await db
        .select({ id: app_logs.id, event: app_logs.event, ts: app_logs.ts, level: app_logs.level })
        .from(app_logs)
        .where(eq(app_logs.userId, caseRow.userId))
        .orderBy(desc(app_logs.ts))
        .limit(8);

      // Admin actions taken on this user (subscription extensions, resets, temp pw, grants)
      adminActions = await db
        .select({ id: app_logs.id, event: app_logs.event, ts: app_logs.ts, data: app_logs.data })
        .from(app_logs)
        .where(and(eq(app_logs.userId, caseRow.userId), like(app_logs.event, 'admin.%')))
        .orderBy(desc(app_logs.ts))
        .limit(20);

      // Outbound emails sent to this user (marketing offers + support)
      outbound = await db
        .select({
          id: outbound_emails.id,
          subject: outbound_emails.subject,
          campaign: outbound_emails.campaign,
          type: outbound_emails.type,
          sentAt: outbound_emails.sentAt,
          caseId: outbound_emails.caseId,
        })
        .from(outbound_emails)
        .where(eq(outbound_emails.userId, caseRow.userId))
        .orderBy(desc(outbound_emails.sentAt))
        .limit(20);

      const sessions = await db
        .select({ createdAt: session.createdAt })
        .from(session)
        .where(eq(session.userId, caseRow.userId))
        .orderBy(desc(session.createdAt))
        .limit(1);

      lastSession = sessions[0]?.createdAt ?? null;

      pastCases = await db
        .select({
          id: support_cases.id,
          title: support_cases.title,
          status: support_cases.status,
          createdAt: support_cases.createdAt,
        })
        .from(support_cases)
        .where(and(eq(support_cases.userId, caseRow.userId), ne(support_cases.id, caseId)))
        .orderBy(desc(support_cases.createdAt));
    }
  }

  const subscription = matchedUser ? await buildSubscriptionSummary(setting, caseRow.userId) : null;

  return NextResponse.json({
    case: {
      id: caseRow.id,
      title: caseRow.title,
      status: caseRow.status,
      priority: caseRow.priority,
      adminNotes: caseRow.adminNotes,
      createdAt: caseRow.createdAt,
      resolvedAt: caseRow.resolvedAt,
      fromEmail: caseRow.fromEmail,
      fromName: caseRow.fromName,
    },
    user: matchedUser,
    setting,
    subscription,
    lastSession,
    recentLogs,
    adminActions,
    outbound,
    pastCases,
    linkedEmails: linkedEmailsWithReplies,
  });
}
