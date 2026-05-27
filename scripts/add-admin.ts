#!/usr/bin/env tsx
/**
 * Adds a single admin user (creates if needed, then sets role=admin).
 *
 * Usage:
 *   ADMIN_EMAIL="x@y.com" ADMIN_NAME="Name" ADMIN_PASS="..." npx tsx scripts/add-admin.ts
 *
 * After running, copy the printed user ID into lib/auth.js → adminUserIds[].
 */

import { auth } from '../lib/auth.js';
import { db } from '../Drizzle/index.ts';
import { user } from '../Drizzle/db/schema.ts';
import { eq } from 'drizzle-orm';

const email = process.env.ADMIN_EMAIL;
const name  = process.env.ADMIN_NAME;
const pass  = process.env.ADMIN_PASS;

if (!email || !name || !pass) {
  console.error('Set ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASS environment variables');
  process.exit(1);
}

async function main() {
  const existing = await db.select().from(user).where(eq(user.email, email!));
  let userId: string;

  if (existing.length > 0) {
    userId = existing[0].id;
    console.log(`User ${email} already exists (id: ${userId}) — updating role to admin.`);
  } else {
    const result = await auth.api.signUpEmail({ body: { name: name!, email: email!, password: pass! } });
    userId = result?.user?.id;
    if (!userId) { console.error('signUpEmail failed:', result); process.exit(1); }
    console.log(`Created user ${email} (id: ${userId})`);
  }

  await db.update(user).set({ role: 'admin' }).where(eq(user.id, userId));
  console.log(`\n✅ role=admin set for ${email}`);
  console.log(`\nAdd this ID to lib/auth.js → adminUserIds[]:\n  "${userId}"`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
