import { NextResponse, after } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { fetchDigestsSince, parseDigest } from '@/lib/gmail';
import { getUserWithEmail } from '@/lib/userSettings';
import { db } from '@/Drizzle/index.ts';
import { support_emails, outbound_emails } from '@/Drizzle/db/schema';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { fireCaseToSlack } from '@/lib/support/autofire';
import { caseForInbound } from '@/lib/support/caseFor';

// Internal staff domain — replies from these addresses are not customer tickets
const INTERNAL_DOMAINS = ['gymnasticbodies.com'];

export const maxDuration = 120; // after() fires the agent for each new inbound before the fn ends

function isInternalSender(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return INTERNAL_DOMAINS.includes(domain);
}

// Auto-investigate on receipt: fire the support agent (read-only investigation -> posts a play to
// Slack) for each newly-cased inbound email. This never sends anything to the customer — the human
// Accept gate + 5-min fuse still control that. Deduped to one fire per case per sync run.
async function autoFireNewCases(byCase) {
  const base = process.env.SUPPORT_PUBLIC_URL || 'https://app.gymnasticbodies.com';
  const entries = [...byCase.entries()]; // [caseId, email]
  // fireCaseToSlack verifies the post actually landed, retries once, and logs every outcome —
  // so a reply that fails to reach Slack surfaces as support.autofire.failed instead of vanishing.
  await Promise.allSettled(entries.map(([caseId, email]) => fireCaseToSlack({ email, caseId, base })));
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

// Guard: skip any message carrying our internal X-GB-Source header. The in-app "Contact Support"
// form is handled directly (DB row + case + Slack fire) and no longer emails a copy here, so this
// should match nothing in normal operation — it only skips a leftover marked test message still in
// the inbox so it can't be ingested as a bogus ticket. Safe to remove once that message ages out.
function isInAppEcho(raw) {
  const h = (raw.payload?.headers ?? []).find((x) => x.name.toLowerCase() === 'x-gb-source');
  return !!h && /inapp/i.test(h.value ?? '');
}

// The latest outbound email we sent this address in the last 90 days (case-insensitive). Used only to
// link that send to the case its reply landed on (Outbound tab "Case" badge) — the case itself is
// picked by lib/support/caseFor.js: every inbound message is a case, whatever it replies to.
async function findOutboundMatch(fromEmail) {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: outbound_emails.id, caseId: outbound_emails.caseId })
    .from(outbound_emails)
    .where(and(sql`lower(${outbound_emails.toEmail}) = ${String(fromEmail).toLowerCase()}`, gte(outbound_emails.sentAt, since)))
    .orderBy(desc(outbound_emails.sentAt))
    .limit(1);
  return rows[0] ?? null;
}

const header = (raw, name) => (raw.payload?.headers ?? []).find((h) => h.name.toLowerCase() === name)?.value ?? null;

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
    const autoFire = new Map(); // caseId -> email, for the post-run agent auto-fire

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

      // Skip the emailed copy of an in-app message — it's already recorded via the in-app route.
      if (isInAppEcho(raw)) { skipped++; continue; }

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

        // Pick the case by the shared rules (reply -> its case, reopened < 60 days / new + linked
        // after; fresh -> the member's open case or a new one). Gmail-forwarded contact-form mail
        // carries no member headers, so it falls through to the fresh-message rule.
        const inReplyTo = header(raw, 'in-reply-to');
        const references = header(raw, 'references');
        const picked = await caseForInbound({
          email: msg.fromEmail,
          userId: user?.id ?? null,
          name: msg.fromName || null,
          subject: msg.subject,
          inReplyTo,
          references,
          threadId: raw.threadId ?? null,
        });
        const caseId = picked.caseId;
        const outboundMatch = (inReplyTo || references) ? await findOutboundMatch(msg.fromEmail) : null;

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

        // A reply to one of our automated (case-less) sends: point that send at the case it opened.
        if (outboundMatch && !outboundMatch.caseId) {
          await db
            .update(outbound_emails)
            .set({ caseId })
            .where(eq(outbound_emails.id, outboundMatch.id));
        }
        if (picked.action !== 'attached') logger.info('support.case_picked', { email: msg.fromEmail, caseId, action: picked.action, via: picked.via, linkedFrom: picked.linkedFrom ?? null });

        inserted++;
        if (caseId) autoFire.set(caseId, msg.fromEmail); // one fire per case this run
      }

      if (parsed.length === 0) skipped++;
    }

    logger.info('admin.gmail.sync', { inserted, skipped, digests: rawMessages.length, autoFired: autoFire.size });
    // Auto-fire the agent for each new case AFTER the response (kept alive by after()).
    if (autoFire.size) after(() => autoFireNewCases(autoFire).catch((e) => logger.error('support.autofire.error', { error: e.message })));
    return NextResponse.json({ inserted, skipped, digests: rawMessages.length, autoFired: autoFire.size });
  } catch (err) {
    logger.error('admin.gmail.sync.error', { error: err.message });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
