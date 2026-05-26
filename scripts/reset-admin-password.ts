import { auth } from '../lib/auth.js';
import { db } from '../Drizzle/index.ts';
import { user } from '../Drizzle/db/schema.ts';
import { account } from '../Drizzle/db/schema.ts';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../lib/password.js';

const args = process.argv.slice(2);
const get = (flag: string) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const email = get('--email');
const password = get('--password');

if (!email || !password) {
  console.error('Usage: npx tsx --env-file=.env scripts/reset-admin-password.ts --email <e> --password <p>');
  process.exit(1);
}

async function main() {
  const users = await db.select({ id: user.id }).from(user).where(eq(user.email, email!));
  if (!users.length) { console.error('User not found:', email); process.exit(1); }
  const userId = users[0].id;
  const hash = await hashPassword(password!);
  await db.update(account).set({ password: hash }).where(eq(account.userId, userId));
  console.log(`Password reset for ${email} (id: ${userId})`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
