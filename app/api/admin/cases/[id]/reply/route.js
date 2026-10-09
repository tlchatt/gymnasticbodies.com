import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_cases, support_emails } from '@/Drizzle/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { sendCaseEmail, replySubject } from '@/lib/support/sendSupport';

// Admin reply from the case page — the same send path as the message ("ticket") reply: sent to the
// case's member with the case id in its Message-ID, recorded on the case's latest inbound message
// (support_replies), or as an outbound_emails support row when the case has no inbound message.
// The admin typing the reply and clicking Send is the owner approval (Support Email Rule).
export async function POST(request, { params }) {
  const { error, user: adminUser } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const caseId = parseInt(id);
  if (isNaN(caseId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const [c] = await db.select().from(support_cases).where(eq(support_cases.id, caseId));
  if (!c) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { body } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Reply body required' }, { status: 400 });

  const [latest] = await db
    .select({ id: support_emails.id, subject: support_emails.subject, fromEmail: support_emails.fromEmail })
    .from(support_emails)
    .where(eq(support_emails.caseId, caseId))
    .orderBy(desc(support_emails.receivedAt))
    .limit(1);

  const to = latest?.fromEmail || c.fromEmail;
  let sent;
  try {
    sent = await sendCaseEmail({
      to,
      subject: replySubject(latest?.subject || c.title),
      text: body,
      caseId,
      emailId: latest?.id ?? null,
      adminUserId: adminUser.id,
      userId: c.userId,
    });
  } catch (err) {
    logger.error('admin.case_reply.send_failed', { caseId, error: err.message });
    return NextResponse.json({ error: `Send failed: ${err.message}` }, { status: 500 });
  }

  logger.info('admin.case_reply.sent', { caseId, emailId: latest?.id ?? null, to, adminId: adminUser.id, recordedIn: sent.recordedIn, messageId: sent.messageId });
  if (sent.recorded !== true) return NextResponse.json({ error: `Email was SENT but not recorded: ${sent.recorded}`, sent: true }, { status: 500 });
  return NextResponse.json({
    ok: true,
    item: {
      kind: sent.recordedIn === 'support_replies' ? 'reply' : 'outbound',
      id: sent.recordId,
      emailId: latest?.id ?? null,
      body: body.trim(),
      at: sent.reply?.sentAt ?? new Date().toISOString(),
    },
  });
}
