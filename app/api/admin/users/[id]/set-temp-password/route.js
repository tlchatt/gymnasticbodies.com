import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getUserWithId } from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { account } from '@/Drizzle/db/schema';
import { eq, and } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';
import { logger } from '@/lib/logger';

const ARGON_OPTS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  outputLen: 32,
  algorithm: 2,
};

function generateTempPassword() {
  const words = ['Gym', 'Body', 'Move', 'Jump', 'Flex', 'Core', 'Ring', 'Lift'];
  const word = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}${num}!`;
}

export async function POST(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await getUserWithId(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const tempPassword = generateTempPassword();
  const hashed = await hash(tempPassword, ARGON_OPTS);

  const updated = await db
    .update(account)
    .set({ password: hashed })
    .where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
    .returning({ id: account.id });

  if (!updated.length) {
    return NextResponse.json({ error: 'No credential account found for this user' }, { status: 404 });
  }

  logger.info('admin.temp_password_set', { email: user.email, userId: user.id });
  return NextResponse.json({ ok: true, tempPassword, email: user.email });
}
