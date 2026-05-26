import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_cases, support_emails, user } from '@/Drizzle/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const base = db
    .select({
      id: support_cases.id,
      title: support_cases.title,
      status: support_cases.status,
      priority: support_cases.priority,
      fromEmail: support_cases.fromEmail,
      fromName: support_cases.fromName,
      createdAt: support_cases.createdAt,
      resolvedAt: support_cases.resolvedAt,
      adminNotes: support_cases.adminNotes,
      userId: support_cases.userId,
      userName: user.name,
      userEmail: user.email,
      migrationType: user.migrationType,
    })
    .from(support_cases)
    .leftJoin(user, eq(support_cases.userId, user.id))
    .orderBy(desc(support_cases.createdAt))
    .limit(200);

  const rows = status
    ? await base.where(eq(support_cases.status, status))
    : await base;

  return NextResponse.json({ cases: rows });
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { fromEmail, fromName, title, priority, emailId, userId } = body;

  if (!fromEmail || !title) {
    return NextResponse.json({ error: 'fromEmail and title are required' }, { status: 400 });
  }

  const [newCase] = await db
    .insert(support_cases)
    .values({
      fromEmail,
      fromName: fromName ?? null,
      title,
      priority: priority ?? 'normal',
      userId: userId ?? null,
    })
    .returning();

  if (emailId) {
    await db
      .update(support_emails)
      .set({ caseId: newCase.id })
      .where(eq(support_emails.id, emailId));
  }

  return NextResponse.json({ case: newCase }, { status: 201 });
}
