import { getGmailClient } from '../lib/gmail.js';

async function main() {
  const gmail = getGmailClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const afterEpoch = Math.floor(since.getTime() / 1000);

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `list:support@gymnasticbodies.com after:${afterEpoch}`,
    maxResults: 10,
  });

  for (const m of (res.data.messages ?? []).slice(0, 5)) {
    const full = await gmail.users.messages.get({ userId: 'me', id: m.id!, format: 'full' });
    const headers = Object.fromEntries((full.data.payload?.headers ?? []).map(h => [h.name!.toLowerCase(), h.value!]));
    
    // Decode body
    function decode(data: string) {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    }
    function getBody(payload: any): string {
      if (!payload) return '';
      if (payload.mimeType === 'text/plain' && payload.body?.data) return decode(payload.body.data);
      if (payload.parts) for (const p of payload.parts) { const t = getBody(p); if (t) return t; }
      return '';
    }

    const body = getBody(full.data.payload);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Subject: ${headers.subject}`);
    console.log(`From:    ${headers.from}`);
    console.log(`To:      ${headers.to}`);
    console.log(`--- BODY (first 600 chars) ---`);
    console.log(body.slice(0, 600));
    console.log('...');
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
