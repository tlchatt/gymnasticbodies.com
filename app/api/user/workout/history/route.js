/**
 * /api/user/workout/history — Neon replacement for AWS /workout-history/all-access/users/{id}.
 * Served exclusively from user_logs section='history' docs (seeded from the AWS export +
 * write-through from BYO/levels log operations).
 *
 * GET ?userId=&year=2026&month=7   (month 1-based, matches the legacy query params)
 *   -> { "2026-07-03": [{courseName, courseIcon, type, level, progression?}], ... }
 */
import { corsJson, corsOptions, readDocsInRange } from "@/lib/workout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams;
        const userId = p.get('userId');
        const year = parseInt(p.get('year'), 10);
        const month = parseInt(p.get('month'), 10);
        if (!userId || !year || !month || month < 1 || month > 12) {
            return corsJson({ error: 'userId, year and month (1-12) required' }, 400);
        }
        const from = `${year}-${String(month).padStart(2, '0')}-01`;
        const to = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;

        const rows = await readDocsInRange(userId, 'history', from, to);
        const out = {};
        for (const r of rows) {
            const entries = (r.data?.entries || [])
                // strip internal idempotency keys from the response
                .map(({ source, refId, ...entry }) => entry);
            if (entries.length) out[r.userScheduleDate] = entries;
        }
        return corsJson(out);
    } catch (error) {
        console.log('history GET error:', error);
        return corsJson({ error: error.message }, 400);
    }
}
