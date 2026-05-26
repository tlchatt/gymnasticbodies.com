import { db } from '../Drizzle/index.ts';
import { support_emails } from '../Drizzle/db/schema.ts';

async function main() {
  // Preview what's in the table
  const all = await db.select({
    id: support_emails.id,
    fromEmail: support_emails.fromEmail,
    subject: support_emails.subject,
  }).from(support_emails);

  console.log(`Total tickets: ${all.length}`);
  console.log('Deleting all (Gmail query fix will re-sync only real support emails)...');

  const { rowCount } = await db.delete(support_emails);
  console.log(`Deleted ${rowCount} rows.`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
