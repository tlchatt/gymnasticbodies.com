import { getGmailClient } from '../lib/gmail.js';

async function main() {
  const gmail = getGmailClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const afterEpoch = Math.floor(since.getTime() / 1000);
  const res = await gmail.users.messages.list({ userId: 'me', q: `list:support@gymnasticbodies.com after:${afterEpoch}`, maxResults: 2 });
  
  const m = res.data.messages?.[0];
  if (!m) { console.log('No messages found'); process.exit(0); }
  
  const full = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
  
  // Walk the whole payload tree
  function walk(payload: any, depth = 0): void {
    const indent = '  '.repeat(depth);
    console.log(`${indent}mimeType: ${payload.mimeType}`);
    if (payload.body?.size) console.log(`${indent}body.size: ${payload.body.size}, has data: ${!!payload.body.data}`);
    if (payload.parts) payload.parts.forEach((p: any) => walk(p, depth + 1));
  }
  
  console.log('Payload structure:');
  walk(full.data.payload);
  
  // Try to get raw message
  const raw = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'raw' });
  const decoded = Buffer.from(raw.data.raw!, 'base64url').toString('utf-8');
  console.log('\n--- RAW EMAIL (first 1500 chars) ---');
  console.log(decoded.slice(0, 1500));
  
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
