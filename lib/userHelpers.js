import { db } from '@/Drizzle/index.ts';
import { support_emails, support_cases, user_logs } from '@/Drizzle/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function fetchUserSupportHistory(userId) {
    if (!userId) return [];
    try {
        const rows = await db
            .select({
                id: support_emails.id,
                subject: support_emails.subject,
                body: support_emails.body,
                receivedAt: support_emails.receivedAt,
                status: support_emails.status,
                caseId: support_emails.caseId,
                caseTitle: support_cases.title,
                caseStatus: support_cases.status,
            })
            .from(support_emails)
            .leftJoin(support_cases, eq(support_emails.caseId, support_cases.id))
            .where(eq(support_emails.userId, userId))
            .orderBy(desc(support_emails.receivedAt))
            .limit(20);
        return rows;
    } catch {
        return [];
    }
}

export async function fetchUserWorkoutLogs(userId) {
    if (!userId) return [];
    try {
        const rows = await db
            .select({
                id: user_logs.id,
                userScheduleDate: user_logs.userScheduleDate,
                createdAt: user_logs.createdAt,
            })
            .from(user_logs)
            // 'levels' only: seeded AWS-history sections share one seed-run createdAt
            // and would otherwise swamp this newest-200 admin/account panel.
            .where(and(eq(user_logs.userId, userId), eq(user_logs.section, 'levels')))
            .orderBy(desc(user_logs.createdAt))
            .limit(200);
        return rows;
    } catch {
        return [];
    }
}
