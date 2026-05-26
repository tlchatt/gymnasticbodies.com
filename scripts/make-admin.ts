import { db } from '../Drizzle/index.ts';
import { user } from '../Drizzle/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  await db.update(user).set({ role: 'admin' }).where(eq(user.email, 'greggorywiley@tlchatt.com'));
  console.log('Done — greggorywiley@tlchatt.com is now admin');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
