import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_emails, support_replies } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { sendSupportEmail } from '@/lib/gmail';
import { logger } from '@/lib/logger';

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

  let gmailMessageId = null;
  try {
    const sent = await sendSupportEmail({
      to: ticket.fromEmail,
      subject: ticket.subject.startsWith('Re:') ? ticket.subject : `Re: ${ticket.subject}`,
      body: body.trim(),
    });
    gmailMessageId = sent.id ?? null;
  } catch (err) {
    logger.error('admin.reply.send_failed', { ticketId, error: err.message });
    return NextResponse.json({ error: `Gmail send failed: ${err.message}` }, { status: 500 });
  }

  const [inserted] = await db.insert(support_replies).values({
    emailId: ticketId,
    adminUserId: adminUser.id,
    body: body.trim(),
    gmailMessageId,
  }).returning();

  await db.update(support_emails)
    .set({ status: 'replied', repliedAt: new Date() })
    .where(eq(support_emails.id, ticketId));

  logger.info('admin.reply.sent', { ticketId, to: ticket.fromEmail, adminId: adminUser.id });
  return NextResponse.json({ reply: inserted });
}
