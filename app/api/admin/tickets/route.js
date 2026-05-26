import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_emails, user } from '@/Drizzle/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const base = db
    .select({
      id: support_emails.id,
      fromEmail: support_emails.fromEmail,
      fromName: support_emails.fromName,
      subject: support_emails.subject,
      receivedAt: support_emails.receivedAt,
      status: support_emails.status,
      userId: support_emails.userId,
      caseId: support_emails.caseId,
      migrationType: user.migrationType,
    })
    .from(support_emails)
    .leftJoin(user, eq(support_emails.userId, user.id))
    .orderBy(desc(support_emails.receivedAt))
    .limit(200);

  const rows = status
    ? await base.where(eq(support_emails.status, status))
    : await base;

  return NextResponse.json({ tickets: rows });
}
