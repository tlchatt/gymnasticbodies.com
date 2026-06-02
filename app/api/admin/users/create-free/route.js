import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import {
  getUserWithEmail,
  createAccountForUser,
  queryUserSetting,
  insertIntoUserSetting,
  updateUserClassification,
} from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { user_setting } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { sendResetLinkEmailSG } from '@/lib/sendgrid';
import { logger } from '@/lib/logger';

function calcExpiry(days) {
  if (days === 'indefinite') return new Date('2099-12-31');
  const d = new Date();
  d.setDate(d.getDate() + Number(days));
  return d;
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const { name, email, days = 30 } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  }

  const expiry = calcExpiry(days);
  const expiryIso = expiry.toISOString();

  let userId;
  let isNew = false;

  // Check if user already exists
  let existing = await getUserWithEmail(email.trim());

  if (existing) {
    userId = existing.id;
  } else {
    // Create new account — better-auth generates password internally via passwordCreation()
    const created = await createAccountForUser({
      billing: { first_name: name.trim(), email: email.trim() },
    });
    if (!created) {
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 });
    }
    userId = created.user?.id ?? created.id;
    isNew = true;
  }

  if (!userId) {
    return NextResponse.json({ error: 'Could not resolve user ID' }, { status: 500 });
  }

  // Upsert subscription setting
  const setting = await queryUserSetting(userId, 'subscription');

  if (setting) {
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
    await insertIntoUserSetting({
      userId,
      type: 'subscription',
      status: 'active',
      data: { renewaldate: expiryIso, status: 'active' },
    });
  }

  await updateUserClassification(userId, 'current', 'subscriber');

  // For new users: send a password reset link so they can set their own password
  if (isNew) {
    await sendResetLinkEmailSG({ email: email.trim(), userId });
  }

  logger.info('admin.create_free_user', {
    userId,
    email: email.trim(),
    isNew,
    days: days === 'indefinite' ? 'indefinite' : Number(days),
    expiresAt: expiryIso,
  });

  return NextResponse.json({ ok: true, userId, isNew, expiresAt: expiryIso });
}
