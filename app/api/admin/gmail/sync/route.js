import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { fetchDigestsSince, parseDigest } from '@/lib/gmail';
import { getUserWithEmail } from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { support_emails, support_cases, outbound_emails } from '@/Drizzle/db/schema';
import { eq, desc, and, gte, or } from 'drizzle-orm';
import { logger } from '@/lib/logger';

// Internal staff domain — replies from these addresses are not customer tickets
const INTERNAL_DOMAINS = ['gymnasticbodies.com'];

function isInternalSender(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return INTERNAL_DOMAINS.includes(domain);
}

// Allow Vercel cron to call this route with CRON_SECRET.
// Vercel cron invocations send `Authorization: Bearer <CRON_SECRET>`; manual/CLI
// callers may use the `x-cron-secret` header.
function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers.get('x-cron-secret') === secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

// Automated non-customer mail that would otherwise become tickets now that the
// query includes direct/spam mail: group-moderation reports, bounce daemons.
function isAutomatedNoise(msg) {
  if (/^moderator'?s spam report/i.test(msg.subject ?? '')) return true;
  if (/mailer-daemon|postmaster@/i.test(msg.fromEmail ?? '')) return true;
  return false;
}

// Check if this inbound email is a reply to an outbound email we sent.
// Looks back 90 days. Returns the most recent matching outbound record or null.
async function findOutboundMatch(fromEmail) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: outbound_emails.id,
      subject: outbound_emails.subject,
      campaign: outbound_emails.campaign,
      type: outbound_emails.type,
      sentAt: outbound_emails.sentAt,
    })
    .from(outbound_emails)
    .where(and(eq(outbound_emails.toEmail, fromEmail), gte(outbound_emails.sentAt, since)))
    .orderBy(desc(outbound_emails.sentAt))
    .limit(1);

  return rows[0] ?? null;
}

// Find or create a support case for an incoming email.
// If user has an open/pending case in the last 30 days, link to it.
// Otherwise create a new case.
async function upsertCase({ userId, fromEmail, fromName, subject, isOutboundResponse, campaign }) {
  if (userId) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ id: support_cases.id })
      .from(support_cases)
      .where(
        and(
          eq(support_cases.userId, userId),
          or(eq(support_cases.status, 'open'), eq(support_cases.status, 'pending')),
          gte(support_cases.createdAt, since)
        )
      )
      .orderBy(desc(support_cases.createdAt))
      .limit(1);

    if (existing.length > 0) return existing[0].id;
  }

  // Title hints when it's a reply to our outreach
  const title = isOutboundResponse
    ? `[Response${campaign ? `: ${campaign}` : ''}] ${subject || '(no subject)'}`
    : subject || '(no subject)';

  const [newCase] = await db
    .insert(support_cases)
    .values({
      userId: userId ?? null,
      fromEmail,
      fromName: fromName ?? null,
      title,
      status: 'open',
      priority: isOutboundResponse ? 'high' : 'normal',
    })
    .returning({ id: support_cases.id });

  return newCase.id;
}

export async function POST(request) {
  const isCron = isCronRequest(request);
  if (!isCron) {
    const { error } = await requireAdmin();
    if (error) return error;
  }
  return runSync();
}

// Vercel cron jobs invoke their path with GET — the previous POST-only export meant
// the hourly cron 405'd on every run and never reached the handler. Cron-only: no
// admin-session fallback on GET.
export async function GET(request) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return runSync();
}

async function runSync() {
  try {
    const [latest] = await db
      .select({ receivedAt: support_emails.receivedAt })
      .from(support_emails)
      .orderBy(desc(support_emails.receivedAt))
      .limit(1);

    const since = latest?.receivedAt
      ? new Date(latest.receivedAt.getTime() - 2 * 60 * 1000)
      : new Date();

    const rawMessages = await fetchDigestsSince(since);

    let inserted = 0;
    let skipped = 0;

    // Google Groups delivers the same email as multiple Gmail messages (distinct
    // gmail ids — e.g. an Inbox copy and a Spam copy). Dedup within this run by the
    // RFC Message-ID header, which is identical across copies but distinct for
    // genuine follow-up emails.
    const seenRfcIds = new Set();

    for (const raw of rawMessages) {
      const gmailMessageId = raw.id;

      const rfcId = (raw.payload?.headers ?? []).find(
        (h) => h.name.toLowerCase() === 'message-id'
      )?.value;
      if (rfcId) {
        if (seenRfcIds.has(rfcId)) { skipped++; continue; }
        seenRfcIds.add(rfcId);
      }

      const parsed = parseDigest(raw);

      for (const msg of parsed) {
        // Skip internal staff replies (e.g. luke@gymnasticbodies.com)
        if (isInternalSender(msg.fromEmail)) { skipped++; continue; }

        // Skip automated group-moderation / bounce mail
        if (isAutomatedNoise(msg)) { skipped++; continue; }

        const syntheticId = `${gmailMessageId}_${Buffer.from(msg.fromEmail).toString('base64').slice(0, 8)}`;

        const alreadyExists = await db
          .select({ id: support_emails.id })
          .from(support_emails)
          .where(eq(support_emails.gmailMessageId, syntheticId));

        if (alreadyExists.length > 0) { skipped++; continue; }

        // Link to user account
        const user = await getUserWithEmail(msg.fromEmail);

        // Check if this is a reply to an outbound email we sent
        const outboundMatch = await findOutboundMatch(msg.fromEmail);
        const isSupportReply = outboundMatch?.type === 'support';

        // Only auto-create a case for replies to support outbound emails
        const caseId = isSupportReply ? await upsertCase({
          userId: user?.id ?? null,
          fromEmail: msg.fromEmail,
          fromName: msg.fromName || null,
          subject: msg.subject,
          isOutboundResponse: true,
          campaign: outboundMatch.campaign ?? null,
        }) : null;

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
          caseId,
        });

        // If this was a reply to outbound, update outbound record with the case
        if (outboundMatch) {
          await db
            .update(outbound_emails)
            .set({ caseId })
            .where(eq(outbound_emails.id, outboundMatch.id));
        }

        inserted++;
      }

      if (parsed.length === 0) skipped++;
    }

    logger.info('admin.gmail.sync', { inserted, skipped, digests: rawMessages.length });
    return NextResponse.json({ inserted, skipped, digests: rawMessages.length });
  } catch (err) {
    logger.error('admin.gmail.sync.error', { error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
