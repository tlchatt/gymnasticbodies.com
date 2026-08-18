import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/Drizzle/index.ts';
import { verification } from '@/Drizzle/db/schema';
import { requireAdmin } from '@/lib/adminAuth';
import { getUserWithId } from '@/lib/userSettings';
import { sendResetLinkEmailSG } from '@/lib/sendgrid';
import { logger } from '@/lib/logger';
import { createAdminActionCase } from '@/lib/adminSubscription';

export async function POST(request, { params }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await getUserWithId(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Generate a single-use token and persist it, exactly like /api/user/resetLink.
  // Without this the emailed link ends in '/none' and can never validate against
  // the verification table — the reset is structurally broken.
  const token = randomBytes(32).toString('hex');
  const identifier = `reset-password:${user.id}`;
  await db.delete(verification).where(eq(verification.identifier, identifier));
  await db.insert(verification).values({
    id: token,
    identifier,
    value: token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const sent = await sendResetLinkEmailSG({ email: user.email, userId: user.id, token });
  if (!sent) return NextResponse.json({ error: 'Failed to send reset email' }, { status: 500 });

  logger.info('admin.password_reset_sent', { email: user.email, userId: user.id, adminEmail: admin?.email, adminId: admin?.id });

  // Auto-log a support case for this admin action (going-forward hook).
  await createAdminActionCase({
    userId: user.id,
    title: 'Password reset email sent',
    detail: `Password reset email sent to ${user.email}.`,
    adminUserId: admin?.id,
  });

  return NextResponse.json({ ok: true });
}
