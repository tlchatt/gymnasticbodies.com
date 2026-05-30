import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getGmailClient } from '@/lib/gmail';

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '"We noticed you recently tried to access your GymFit account"';

  const gmail = getGmailClient();

  const res = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults: 200,
  });

  const messages = res.data.messages ?? [];

  const results = await Promise.all(
    messages.map(async (m) => {
      const full = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['From', 'Subject', 'Date', 'To'],
      });
      const headers = Object.fromEntries(
        (full.data.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
      );
      // Extract email address from "Name <email>" format
      const fromRaw = headers.from ?? '';
      const emailMatch = fromRaw.match(/([^\s<]+@[^\s>]+)/);
      const fromEmail = emailMatch ? emailMatch[1].toLowerCase().replace(/[<>]/g, '') : fromRaw;
      const fromName = fromRaw.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fromEmail;

      return {
        messageId: m.id,
        fromEmail,
        fromName,
        subject: headers.subject ?? '',
        date: headers.date ?? '',
        to: headers.to ?? '',
      };
    })
  );

  // Separate sent messages (outreach) from inbound replies
  const adminDomain = 'gymnasticbodies.com';
  const sent = results.filter((r) => r.fromEmail.includes(adminDomain));
  const inbound = results.filter((r) => !r.fromEmail.includes(adminDomain));

  // Deduplicate inbound by fromEmail
  const seen = new Set();
  const uniqueInbound = inbound.filter((r) => {
    if (seen.has(r.fromEmail)) return false;
    seen.add(r.fromEmail);
    return true;
  });

  return NextResponse.json({
    total: messages.length,
    sentCount: sent.length,
    inboundCount: inbound.length,
    uniqueRepliers: uniqueInbound.length,
    repliers: uniqueInbound.map((r) => ({
      email: r.fromEmail,
      name: r.fromName,
      date: r.date,
      subject: r.subject,
    })),
  });
}
