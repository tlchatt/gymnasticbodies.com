import { db } from '../Drizzle/index.ts';
import { account, user } from '../Drizzle/db/schema.ts';
import { eq, inArray } from 'drizzle-orm';

async function main() {
  const adminUserIds = ['buzioZXby6sR6dRMT3zZGoxSKiQj0wbc', '3FJ44luUDpRKHEdukXTkKDIpvk2O1yTn'];
  const accounts = await db.select().from(account).where(inArray(account.userId, adminUserIds));
  console.log('Admin accounts:', JSON.stringify(accounts.map(a => ({
    userId: a.userId,
    providerId: a.providerId,
    hasPassword: !!a.password,
    passwordPreview: a.password?.slice(0, 20),
  })), null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
