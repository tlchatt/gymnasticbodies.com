#!/usr/bin/env node
/**
 * Creates two admin users and sets role='admin' in the DB.
 *
 * Usage:
 *   node scripts/create-admin-users.js \
 *     --email1 greggorywiley@tlchatt.com --name1 "Greggory Wiley" --pass1 "..." \
 *     --email2 someone@example.com --name2 "Someone" --pass2 "..."
 *
 * After running, copy the printed user IDs into lib/auth.js → adminUserIds[].
 */

import { auth } from '../lib/auth.js';
import { db } from '../Drizzle/index.ts';
import { user } from '../Drizzle/db/schema.ts';
import { eq } from 'drizzle-orm';

const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const email1 = get('--email1');
const name1  = get('--name1');
const pass1  = get('--pass1');
const email2 = get('--email2');
const name2  = get('--name2');
const pass2  = get('--pass2');

if (!email1 || !name1 || !pass1 || !email2 || !name2 || !pass2) {
  console.error('Usage: node scripts/create-admin-users.js --email1 <e> --name1 <n> --pass1 <p> --email2 <e> --name2 <n> --pass2 <p>');
  process.exit(1);
}

async function createAdmin(email, name, password) {
  // Check if user already exists
  const existing = await db.select().from(user).where(eq(user.email, email));
  let userId;

  if (existing.length > 0) {
    console.log(`  User ${email} already exists (id: ${existing[0].id}) — skipping signup, updating role.`);
    userId = existing[0].id;
  } else {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    userId = result?.user?.id;
    if (!userId) throw new Error(`signUpEmail failed for ${email}: ${JSON.stringify(result)}`);
    console.log(`  Created user ${email} (id: ${userId})`);
  }

  await db.update(user).set({ role: 'admin' }).where(eq(user.id, userId));
  console.log(`  Set role=admin for ${email}`);
  return userId;
}

async function main() {
  console.log('\nCreating admin users...\n');
  const id1 = await createAdmin(email1, name1, pass1);
  const id2 = await createAdmin(email2, name2, pass2);

  console.log('\n✅ Done. Add these IDs to lib/auth.js → adminUserIds[]:\n');
  console.log(`  "${id1}",`);
  console.log(`  "${id2}",`);
  console.log('\nAlso update the CRON_SECRET in .env if not already set.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
