import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { user, user_setting, app_logs, user_logs, support_emails, support_cases, outbound_emails } from '@/Drizzle/db/schema';
import { and, eq, desc, count, like } from 'drizzle-orm';
import { buildSubscriptionSummary } from '@/lib/adminSubscription';

export async function GET(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  // User
  const users = await db.select().from(user).where(eq(user.id, id));
  if (!users.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const u = users[0];

  // Subscription setting
  const settings = await db
    .select()
    .from(user_setting)
    .where(and(eq(user_setting.userId, id), eq(user_setting.type, 'subscription')));
  const setting = settings[0] ?? null;

  // Recent app_logs (by email — logs are indexed on email)
  const recentLogs = await db
    .select({ id: app_logs.id, ts: app_logs.ts, level: app_logs.level, event: app_logs.event })
    .from(app_logs)
    .where(eq(app_logs.email, u.email))
    .orderBy(desc(app_logs.ts))
    .limit(15);

  // Admin actions on this user (extensions, resets, temp pw, grants) — with data for labels
  const adminActions = await db
    .select({ id: app_logs.id, ts: app_logs.ts, event: app_logs.event, data: app_logs.data })
    .from(app_logs)
    .where(and(eq(app_logs.userId, id), like(app_logs.event, 'admin.%')))
    .orderBy(desc(app_logs.ts))
    .limit(20);

  // Total workout log entries
  const [logsCountRow] = await db
    .select({ cnt: count() })
    .from(user_logs)
    .where(eq(user_logs.userId, id));
  const logsCount = Number(logsCountRow?.cnt ?? 0);

  // Linked support tickets
  const tickets = await db
    .select({
      id: support_emails.id,
      subject: support_emails.subject,
      status: support_emails.status,
      receivedAt: support_emails.receivedAt,
      caseId: support_emails.caseId,
    })
    .from(support_emails)
    .where(eq(support_emails.userId, id))
    .orderBy(desc(support_emails.receivedAt))
    .limit(10);

  // Linked support cases
  const cases = await db
    .select({
      id: support_cases.id,
      title: support_cases.title,
      status: support_cases.status,
      priority: support_cases.priority,
      createdAt: support_cases.createdAt,
    })
    .from(support_cases)
    .where(eq(support_cases.userId, id))
    .orderBy(desc(support_cases.createdAt))
    .limit(5);

  // Outbound emails sent to this user
  const outbound = await db
    .select({
      id: outbound_emails.id,
      subject: outbound_emails.subject,
      campaign: outbound_emails.campaign,
      type: outbound_emails.type,
      sentAt: outbound_emails.sentAt,
      caseId: outbound_emails.caseId,
    })
    .from(outbound_emails)
    .where(eq(outbound_emails.userId, id))
    .orderBy(desc(outbound_emails.sentAt))
    .limit(20);

  const subscription = await buildSubscriptionSummary(setting, id);

  return NextResponse.json({ user: u, setting, subscription, recentLogs, adminActions, logsCount, tickets, cases, outbound });
}
