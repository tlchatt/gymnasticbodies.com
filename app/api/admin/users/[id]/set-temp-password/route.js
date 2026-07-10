import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
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
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await getUserWithId(id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const tempPassword = generateTempPassword();
  const hashed = await hash(tempPassword, ARGON_OPTS);

  // Try to update an existing better-auth credential account first.
  const updated = await db
    .update(account)
    .set({ password: hashed })
    .where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
    .returning({ id: account.id });

  let created = false;
  if (!updated.length) {
    // Legacy users (AWS/WooCommerce imports) have no credential account row yet.
    // Create one so the temp password actually lets them sign in. For a
    // credential provider, better-auth stores accountId = userId.
    await db.insert(account).values({
      id: randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: hashed,
    });
    created = true;
  }

  logger.info('admin.temp_password_set', { email: user.email, userId: user.id, created, adminEmail: admin?.email, adminId: admin?.id });
  return NextResponse.json({ ok: true, tempPassword, email: user.email, created });
}
