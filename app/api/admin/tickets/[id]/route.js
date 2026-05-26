import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_emails, support_replies, support_cases, user, user_setting, app_logs } from '@/Drizzle/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const ticketId = parseInt(id);
  if (isNaN(ticketId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const [ticket] = await db.select().from(support_emails).where(eq(support_emails.id, ticketId));
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const replies = await db
    .select()
    .from(support_replies)
    .where(eq(support_replies.emailId, ticketId))
    .orderBy(support_replies.sentAt);

  let matchedUser = null;
  let userSetting = null;
  let recentLogs = [];

  if (ticket.userId) {
    const [u] = await db.select().from(user).where(eq(user.id, ticket.userId));
    matchedUser = u ?? null;

    if (matchedUser) {
      const settings = await db.select().from(user_setting).where(eq(user_setting.userId, ticket.userId));
      userSetting = settings[0] ?? null;

      recentLogs = await db
        .select({ id: app_logs.id, event: app_logs.event, ts: app_logs.ts, level: app_logs.level })
        .from(app_logs)
        .where(eq(app_logs.userId, ticket.userId))
        .orderBy(desc(app_logs.ts))
        .limit(5);
    }
  }

  let linkedCase = null;
  if (ticket.caseId) {
    const [c] = await db
      .select({ id: support_cases.id, title: support_cases.title, status: support_cases.status })
      .from(support_cases)
      .where(eq(support_cases.id, ticket.caseId));
    linkedCase = c ?? null;
  }

  return NextResponse.json({
    ticket: {
      ...ticket,
      replies,
      user: matchedUser,
      userSetting,
      recentLogs,
      caseId: ticket.caseId ?? null,
      case: linkedCase,
    },
  });
}
