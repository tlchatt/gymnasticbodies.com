import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { getGmailClient } from '@/lib/gmail';

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '"We noticed you recently tried to access your GymFit account"';

  const gmail = getGmailClient();

  // Step 1: find sent outreach emails matching the phrase
  const sentRes = await gmail.users.messages.list({
    userId: 'me',
    q: `in:sent ${q}`,
    maxResults: 200,
  });

  const sentMessages = sentRes.data.messages ?? [];

  if (sentMessages.length === 0) {
    return NextResponse.json({
      total: 0, sentCount: 0, inboundCount: 0, uniqueRepliers: 0, repliers: [],
      debug: 'No sent messages matched the search phrase.',
    });
  }

  // Step 2: collect unique thread IDs from sent outreach
  const threadIds = [...new Set(
    await Promise.all(sentMessages.map(async (m) => {
      const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'minimal' });
      return msg.data.threadId;
    }))
  )];

  // Step 3: for each thread, find replies from external (non-gymnasticbodies.com) senders
  const repliers = [];
  const seenEmails = new Set();

  await Promise.all(threadIds.map(async (threadId) => {
    const thread = await gmail.users.threads.get({ userId: 'me', id: threadId, format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'] });

    for (const msg of thread.data.messages ?? []) {
      const headers = Object.fromEntries(
        (msg.payload?.headers ?? []).map((h) => [h.name.toLowerCase(), h.value])
      );
      const fromRaw = headers.from ?? '';
      const emailMatch = fromRaw.match(/([^\s<]+@[^\s>]+)/);
      const fromEmail = (emailMatch?.[1] ?? '').toLowerCase().replace(/[<>]/g, '');

      if (!fromEmail || fromEmail.includes('gymnasticbodies.com')) continue;
      if (seenEmails.has(fromEmail)) continue;
      seenEmails.add(fromEmail);

      const fromName = fromRaw.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fromEmail;
      repliers.push({ email: fromEmail, name: fromName, date: headers.date ?? '', subject: headers.subject ?? '' });
    }
  }));

  return NextResponse.json({
    total: sentMessages.length,
    sentCount: sentMessages.length,
    threadCount: threadIds.length,
    uniqueRepliers: repliers.length,
    repliers,
  });
}
