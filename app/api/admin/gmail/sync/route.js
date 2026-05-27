import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { requireAdmin } from '@/lib/adminAuth';
import { fetchDigestsSince, parseDigest } from '@/lib/gmail';
import { getUserWithEmail } from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { support_emails } from '@/Drizzle/db/schema';
import { eq, desc } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Allow Vercel cron to call this route with CRON_SECRET header
function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('x-cron-secret') === secret;
}

export async function POST(request) {
  const isCron = isCronRequest(request);
  if (!isCron) {
    const { error } = await requireAdmin();
    if (error) return error;
  }

  try {
    // Use the most recent receivedAt in the DB as cursor.
    // If the table is empty, start from now (no historical backfill).
    // A 2-minute overlap guards against clock skew.
    const [latest] = await db
      .select({ receivedAt: support_emails.receivedAt })
      .from(support_emails)
      .orderBy(desc(support_emails.receivedAt))
      .limit(1);

    const since = latest?.receivedAt
      ? new Date(latest.receivedAt.getTime() - 2 * 60 * 1000)
      : new Date(); // no rows yet → start from right now

    const rawMessages = await fetchDigestsSince(since);

    let inserted = 0;
    let skipped = 0;

    for (const raw of rawMessages) {
      const gmailMessageId = raw.id;

      // Deduplicate at the digest level first
      const existing = await db
        .select({ id: support_emails.id })
        .from(support_emails)
        .where(eq(support_emails.gmailMessageId, gmailMessageId));

      const parsed = parseDigest(raw);

      for (const msg of parsed) {
        // Each parsed message gets a synthetic ID: digest_id + fromEmail hash
        const syntheticId = `${gmailMessageId}_${Buffer.from(msg.fromEmail).toString('base64').slice(0, 8)}`;

        const alreadyExists = await db
          .select({ id: support_emails.id })
          .from(support_emails)
          .where(eq(support_emails.gmailMessageId, syntheticId));

        if (alreadyExists.length > 0) { skipped++; continue; }

        // Try to link to a user account
        const user = await getUserWithEmail(msg.fromEmail);

        await db.insert(support_emails).values({
          gmailMessageId: syntheticId,
          gmailThreadId: raw.threadId ?? null,
          fromEmail: msg.fromEmail,
          fromName: msg.fromName || null,
          subject: msg.subject,
          body: msg.body,
          receivedAt: msg.receivedAt,
          status: 'open',
          userId: user?.id ?? null,
        });

        inserted++;
      }

      // If the digest itself had no parsed sub-messages but wasn't seen before
      if (parsed.length === 0 && existing.length === 0) skipped++;
    }

    logger.info('admin.gmail.sync', { inserted, skipped, digests: rawMessages.length });
    return NextResponse.json({ inserted, skipped, digests: rawMessages.length });
  } catch (err) {
    logger.error('admin.gmail.sync.error', { error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
