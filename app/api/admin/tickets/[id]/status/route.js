import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { support_emails } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';

const VALID_STATUSES = ['open', 'replied', 'closed'];

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const ticketId = parseInt(id);
  if (isNaN(ticketId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const body = await request.json();
  const updates = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status))
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    updates.status = body.status;
  }

  if (body.adminNotes !== undefined) updates.adminNotes = body.adminNotes;

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const [updated] = await db.update(support_emails)
    .set(updates)
    .where(eq(support_emails.id, ticketId))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ticket: updated });
}
