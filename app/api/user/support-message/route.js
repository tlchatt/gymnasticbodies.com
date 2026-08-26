import { NextResponse } from 'next/server';
import { db } from '@/Drizzle/index.ts';
import { support_emails, support_cases } from '@/Drizzle/db/schema';
import { and, eq, or, desc } from 'drizzle-orm';
import { getUserWithId } from '@/lib/userSettings';
import { logger } from '@/lib/logger';
import { randomBytes } from 'crypto';

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
        const { userId, caseId, subject, body } = await request.json();
        const trimmedBody = typeof body === 'string' ? body.trim().slice(0, MAX_BODY_LENGTH) : '';
        if (!userId || !trimmedBody) {
            return NextResponse.json({ error: 'userId and body are required.' }, { status: 400, headers: CORS });
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
                        ? or(eq(support_cases.userId, user.id), eq(support_cases.fromEmail, user.email))
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

        // Case every inbound (parity with the Gmail sync): a message with no caseId must still be
        // cased — attach to the member's most recent open case, reopen a recently-resolved one, or
        // open a new case. Without this, fresh in-app "Contact Support" messages landed uncased.
        let effectiveCaseId = parsedCaseId;
        if (effectiveCaseId == null) {
            const [recent] = await db
                .select({ id: support_cases.id, status: support_cases.status, resolvedAt: support_cases.resolvedAt })
                .from(support_cases)
                .where(user.email
                    ? or(eq(support_cases.userId, user.id), eq(support_cases.fromEmail, user.email))
                    : eq(support_cases.userId, user.id))
                .orderBy(desc(support_cases.createdAt))
                .limit(1);
            const RESOLVED_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;
            if (recent && ['open', 'pending', 'reopened'].includes(recent.status)) {
                effectiveCaseId = recent.id;
            } else if (recent && recent.status === 'resolved' && recent.resolvedAt && (Date.now() - new Date(recent.resolvedAt).getTime()) < RESOLVED_WINDOW_MS) {
                await db.update(support_cases).set({ status: 'reopened' }).where(eq(support_cases.id, recent.id));
                effectiveCaseId = recent.id;
            } else {
                const [created] = await db
                    .insert(support_cases)
                    .values({ userId: user.id, fromEmail: user.email, fromName: user.name, title: resolvedSubject, status: 'open', priority: 'normal' })
                    .returning({ id: support_cases.id });
                effectiveCaseId = created.id;
            }
        }

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

        return NextResponse.json({ ok: true, message: row }, { headers: CORS });
    } catch (error) {
        logger.error('support.message_in_app_failed', { error });
        return NextResponse.json(
            { ok: false, error: error?.message ?? 'Failed to send message.' },
            { status: 500, headers: CORS },
        );
    }
}
