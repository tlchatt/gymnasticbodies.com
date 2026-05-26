import { db } from '../Drizzle/index.ts';
import { user } from '../Drizzle/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const admins = await db.select({ id: user.id, email: user.email, name: user.name, role: user.role }).from(user).where(eq(user.role, 'admin'));
  console.log('Admin users in DB:', JSON.stringify(admins, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
