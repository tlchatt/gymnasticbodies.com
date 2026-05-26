import { db } from '../Drizzle/index.ts';
import { account } from '../Drizzle/db/schema.ts';
import { eq } from 'drizzle-orm';

async function main() {
  const accounts = await db.select({
    id: account.id,
    accountId: account.accountId,
    providerId: account.providerId,
    userId: account.userId,
  }).from(account).where(eq(account.providerId, 'credential'));
  console.log('Credential accounts:', JSON.stringify(accounts, null, 2));
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
