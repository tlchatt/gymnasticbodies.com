import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_emails } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const caseId = parseInt(id);
  if (isNaN(caseId)) return NextResponse.json({ error: 'Invalid case id' }, { status: 400 });

  const body = await request.json();
  const { emailId } = body;
  if (!emailId) return NextResponse.json({ error: 'emailId is required' }, { status: 400 });

  const [updated] = await db
    .update(support_emails)
    .set({ caseId })
    .where(eq(support_emails.id, emailId))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

  return NextResponse.json({ email: updated });
}
