import { NextResponse, after } from 'next/server';
import { db } from '@/Drizzle/index.ts';
import { support_emails, support_cases } from '@/Drizzle/db/schema';
import { and, eq, or, sql } from 'drizzle-orm';
import { getUserWithId } from '@/lib/userSettings';
import { logger } from '@/lib/logger';
import { getSessionUserId } from '@/lib/sessionUser';
import { fireCaseToSlack } from '@/lib/support/autofire';
import { caseForInbound } from '@/lib/support/caseFor';
import { randomBytes } from 'crypto';

// after() fires the support agent for the new inbound before the fn ends (parity with Gmail sync).
export const maxDuration = 120;

// Input caps — trim first, then truncate anything over these lengths.
const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 10000;

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request) {
    try {
        // The sender is whoever owns the live session behind the Bearer token — never the
        // userId in the body. The support agent acts on these messages (cancel, refund,
        // delete), so a body userId alone must not be able to speak for a member.
        const userId = await getSessionUserId(request);
        if (!userId) {
            return NextResponse.json({ error: 'Your sign-in has expired. Please sign in again at my.gymnasticbodies.com to send a message.' }, { status: 401, headers: CORS });
        }

        const { userId: bodyUserId, caseId, subject, body } = await request.json();
        if (bodyUserId && bodyUserId !== userId) {
            logger.warn('support.message_userid_mismatch', { userId, bodyUserId });
        }
        const trimmedBody = typeof body === 'string' ? body.trim().slice(0, MAX_BODY_LENGTH) : '';
        if (!trimmedBody) {
            return NextResponse.json({ error: 'body is required.' }, { status: 400, headers: CORS });
        }

        const user = await getUserWithId(userId);
        if (!user) {
            return NextResponse.json({ error: 'Account not found.' }, { status: 404, headers: CORS });
        }

        // NaN guard — a non-numeric caseId must never reach the integer insert.
        let parsedCaseId = null;
        if (caseId != null && caseId !== '') {
            parsedCaseId = parseInt(caseId, 10);
            if (isNaN(parsedCaseId)) {
                return NextResponse.json({ error: 'Invalid caseId.' }, { status: 400, headers: CORS });
            }
        }

        // Ownership guard — only allow replying onto a case that belongs to this user.
        // Ownership matches how getSupportSection surfaces cases to the member:
        // support_cases.user_id OR from_email (user_id is nullable on older cases).
        if (parsedCaseId != null) {
            const owned = await db
                .select({ id: support_cases.id })
                .from(support_cases)
                .where(and(
                    eq(support_cases.id, parsedCaseId),
                    user.email
                        ? or(eq(support_cases.userId, user.id), sql`lower(${support_cases.fromEmail}) = ${user.email.toLowerCase()}`)
                        : eq(support_cases.userId, user.id),
                ))
                .limit(1);
            if (!owned.length) {
                logger.warn('support.message_case_not_owned', { userId: user.id, email: user.email, caseId: parsedCaseId });
                return NextResponse.json({ error: 'Case not found for this account.' }, { status: 400, headers: CORS });
            }
        }

        const resolvedSubject = (subject?.trim() || (parsedCaseId ? `Reply to case #${parsedCaseId}` : 'Contact Support'))
            .slice(0, MAX_SUBJECT_LENGTH);

        // Case every inbound by the shared rules (lib/support/caseFor.js — same picker as the Gmail
        // sync): a reply on a case reopens it (< 60 days) or opens a linked new case; a fresh message
        // goes on the member's open case or a new case linked back to their last one.
        const picked = await caseForInbound({
            email: user.email,
            userId: user.id,
            name: user.name,
            subject: resolvedSubject,
            replyToCaseId: parsedCaseId,
        });
        const effectiveCaseId = picked.caseId;

        // Insert an INBOUND support_emails row so it lands in the admin inbox exactly
        // like a normal inbound email. Bypasses the Gmail pipeline entirely. A synthetic
        // gmailMessageId keeps the unique constraint happy and marks the in-app origin.
        const inserted = await db.insert(support_emails).values({
            gmailMessageId: `inapp_${userId}_${randomBytes(6).toString('hex')}`,
            fromEmail: user.email,
            fromName: user.name,
            subject: resolvedSubject,
            body: trimmedBody,
            receivedAt: new Date(),
            status: 'open',
            userId: user.id,
            caseId: effectiveCaseId,
        }).returning();

        const row = inserted?.[0] ?? null;

        logger.info('support.message_in_app', { userId: user.id, email: user.email, caseId: effectiveCaseId, emailId: row?.id });

        // Fire the support agent -> Slack after responding to the member's browser (parity with the
        // Gmail sync's autoFireNewCases). fireCaseToSlack verifies the post landed, retries once, and
        // logs every outcome. This is the fix for in-app messages never reaching Slack.
        if (user.email && effectiveCaseId) {
            after(() => fireCaseToSlack({ email: user.email, caseId: effectiveCaseId }));
        }

        return NextResponse.json({ ok: true, message: row }, { headers: CORS });
    } catch (error) {
        logger.error('support.message_in_app_failed', { error });
        return NextResponse.json(
            { ok: false, error: error?.message ?? 'Failed to send message.' },
            { status: 500, headers: CORS },
        );
    }
}
