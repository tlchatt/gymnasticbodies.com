import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_cases, support_emails, support_replies, user, user_setting, app_logs, session } from '@/Drizzle/db/schema';
import { eq, desc, and, ne, inArray } from 'drizzle-orm';

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
  let pastCases = [];

  if (caseRow.userId) {
    const [u] = await db.select().from(user).where(eq(user.id, caseRow.userId));
    matchedUser = u ?? null;

    if (matchedUser) {
      const settings = await db.select().from(user_setting).where(eq(user_setting.userId, caseRow.userId));
      setting = settings[0] ?? null;

      recentLogs = await db
        .select({ id: app_logs.id, event: app_logs.event, ts: app_logs.ts, level: app_logs.level })
        .from(app_logs)
        .where(eq(app_logs.userId, caseRow.userId))
        .orderBy(desc(app_logs.ts))
        .limit(8);

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
    lastSession,
    recentLogs,
    pastCases,
    linkedEmails: linkedEmailsWithReplies,
  });
}
