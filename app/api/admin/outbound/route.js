import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index';
import { outbound_emails, user } from '@/Drizzle/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rows = await db
    .select({
      id: outbound_emails.id,
      toEmail: outbound_emails.toEmail,
      subject: outbound_emails.subject,
      body: outbound_emails.body,
      campaign: outbound_emails.campaign,
      sentAt: outbound_emails.sentAt,
      caseId: outbound_emails.caseId,
      userName: user.name,
    })
    .from(outbound_emails)
    .leftJoin(user, eq(outbound_emails.userId, user.id))
    .orderBy(desc(outbound_emails.sentAt));

  return NextResponse.json({ outbound: rows });
}
