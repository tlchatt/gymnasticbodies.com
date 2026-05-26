import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_cases } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const caseId = parseInt(id);
  if (isNaN(caseId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await request.json();
  const { status, priority, adminNotes, resolvedAt } = body;

  const updates = {};
  if (status !== undefined) updates.status = status;
  if (priority !== undefined) updates.priority = priority;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes;

  if (resolvedAt !== undefined) {
    updates.resolvedAt = resolvedAt ? new Date(resolvedAt) : null;
  } else if (status === 'resolved' || status === 'closed') {
    updates.resolvedAt = new Date();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const [updated] = await db
    .update(support_cases)
    .set(updates)
    .where(eq(support_cases.id, caseId))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ case: updated });
}
