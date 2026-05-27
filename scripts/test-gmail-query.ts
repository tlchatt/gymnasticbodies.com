import { getGmailClient, parseDigest } from '../lib/gmail.js';

async function main() {
  const gmail = getGmailClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const afterEpoch = Math.floor(since.getTime() / 1000);

  console.log('\n=== Testing Gmail query ===');
  console.log('Since:', since.toISOString());

  // Test current query
  const q1 = `list:support@gymnasticbodies.com after:${afterEpoch}`;
  const r1 = await gmail.users.messages.list({ userId: 'me', q: q1, maxResults: 20 });
  console.log(`\nQuery: "${q1}"`);
  console.log(`Results: ${r1.data.messages?.length ?? 0} messages`);

  // Also try broader queries to see what's in the inbox
  const q2 = `from:support@gymnasticbodies.com after:${afterEpoch}`;
  const r2 = await gmail.users.messages.list({ userId: 'me', q: q2, maxResults: 20 });
  console.log(`\nQuery: "${q2}"`);
  console.log(`Results: ${r2.data.messages?.length ?? 0} messages`);

  const q3 = `to:support@gymnasticbodies.com after:${afterEpoch}`;
  const r3 = await gmail.users.messages.list({ userId: 'me', q: q3, maxResults: 20 });
  console.log(`\nQuery: "${q3}"`);
  console.log(`Results: ${r3.data.messages?.length ?? 0} messages`);

  const q4 = `gymnasticbodies after:${afterEpoch}`;
  const r4 = await gmail.users.messages.list({ userId: 'me', q: q4, maxResults: 20 });
  console.log(`\nQuery: "${q4}"`);
  console.log(`Results: ${r4.data.messages?.length ?? 0} messages`);

  // If list query found messages, show their subjects and parse them
  if (r1.data.messages?.length) {
    console.log('\n=== Parsing list: query results ===');
    for (const m of r1.data.messages.slice(0, 3)) {
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
      const headers = Object.fromEntries((full.data.payload?.headers ?? []).map(h => [h.name!.toLowerCase(), h.value!]));
      console.log(`\nMessage ID: ${m.id}`);
      console.log(`Subject: ${headers.subject}`);
      console.log(`From: ${headers.from}`);
      console.log(`List-Id: ${headers['list-id'] ?? '(none)'}`);
      const parsed = parseDigest(full.data);
      console.log(`Parsed messages: ${parsed.length}`);
      parsed.forEach((p, i) => console.log(`  [${i+1}] ${p.fromEmail} — ${p.subject}`));
    }
  }

  // Show subjects from the broader query too
  if (r4.data.messages?.length) {
    console.log('\n=== Subjects from broad query ===');
    for (const m of r4.data.messages.slice(0, 5)) {
      const full = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'metadata', metadataHeaders: ['Subject', 'From', 'List-Id'] });
      const headers = Object.fromEntries((full.data.payload?.headers ?? []).map(h => [h.name!.toLowerCase(), h.value!]));
      console.log(`  ${headers.subject} | from: ${headers.from} | list-id: ${headers['list-id'] ?? 'none'}`);
    }
  }

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
