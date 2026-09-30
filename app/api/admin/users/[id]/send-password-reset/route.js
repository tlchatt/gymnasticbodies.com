import { NextResponse } from 'next/server';
import { mintResetToken } from '@/lib/resetToken';
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
  const token = await mintResetToken(user.id);

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
