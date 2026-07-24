import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getUserWithId, queryUserSetting, insertIntoUserSetting, updateUserClassification } from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { user_setting } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { createAdminActionCase } from '@/lib/adminSubscription';

function calcExpiry(days) {
  if (days === 'indefinite') return new Date('2099-12-31');
  const d = new Date();
  d.setDate(d.getDate() + Number(days));
  return d;
}

export async function POST(request, { params }) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const days = body.days ?? 30;

  const user = await getUserWithId(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const expiry = calcExpiry(days);
  const expiryIso = expiry.toISOString();

  const setting = await queryUserSetting(id, 'subscription');

  if (setting) {
    // Update existing setting — merge into existing data object
    let data = setting.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { data = {}; }
    }
    data = data ?? {};
    data.renewaldate = expiryIso;

    await db.update(user_setting)
      .set({ data, status: 'active' })
      .where(eq(user_setting.id, setting.id));
  } else {
    // Create a new subscription setting row
    await insertIntoUserSetting({
      userId: id,
      type: 'subscription',
      status: 'active',
      data: { renewaldate: expiryIso, status: 'active' },
    });
  }

  await updateUserClassification(id, 'current', 'subscriber');

  logger.info('admin.grant_access', {
    userId: id,
    email: user.email,
    days: days === 'indefinite' ? 'indefinite' : Number(days),
    expiresAt: expiryIso,
    adminEmail: admin?.email,
    adminId: admin?.id,
  });

  // Auto-log a support case for this admin action (going-forward hook).
  const isCredit = body.credit === true || body.type === 'credit';
  const durationLabel = days === 'indefinite' ? 'indefinite access' : `${Number(days)} days of access`;
  await createAdminActionCase({
    userId: id,
    title: isCredit ? 'Membership credit applied' : 'Access granted',
    detail: `Granted ${durationLabel}, expires ${expiryIso}.`,
    adminUserId: admin?.id,
  });

  return NextResponse.json({ ok: true, expiresAt: expiryIso });
}
