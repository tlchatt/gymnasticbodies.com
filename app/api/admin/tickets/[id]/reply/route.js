import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_emails } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { caseForOutbound } from '@/lib/support/caseFor';
import { sendCaseEmail, replySubject } from '@/lib/support/sendSupport';

// Admin reply to one inbound message. The reply is a communication on the message's CASE: it is sent
// with the case id in its Message-ID and recorded in support_replies. A message that somehow has no
// case (pre-backfill rows) is put on the member's open case / a new case first — never sent uncased.
// The admin typing the reply and clicking Send is the owner approval (Support Email Rule).
export async function POST(request, { params }) {
  const { error, user: adminUser } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const ticketId = parseInt(id);
  if (isNaN(ticketId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const [ticket] = await db.select().from(support_emails).where(eq(support_emails.id, ticketId));
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { body } = await request.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Reply body required' }, { status: 400 });

  let caseId = ticket.caseId;
  if (!caseId) {
    ({ caseId } = await caseForOutbound({ email: ticket.fromEmail, userId: ticket.userId, name: ticket.fromName, title: ticket.subject }));
    await db.update(support_emails).set({ caseId }).where(eq(support_emails.id, ticketId));
  }

  let sent;
  try {
    sent = await sendCaseEmail({
      to: ticket.fromEmail,
      subject: replySubject(ticket.subject),
      text: body,
      caseId,
      emailId: ticketId,
      adminUserId: adminUser.id,
      userId: ticket.userId,
    });
  } catch (err) {
    logger.error('admin.reply.send_failed', { ticketId, caseId, error: err.message });
    return NextResponse.json({ error: `Send failed: ${err.message}` }, { status: 500 });
  }

  logger.info('admin.reply.sent', { ticketId, caseId, to: ticket.fromEmail, adminId: adminUser.id, recorded: sent.recorded, messageId: sent.messageId });
  if (sent.recorded !== true) return NextResponse.json({ error: `Email was SENT but not recorded: ${sent.recorded}`, sent: true, caseId }, { status: 500 });
  return NextResponse.json({ reply: sent.reply, caseId });
}
