// The support_fires queue as the admin review card needs it — the same rows the Slack cards are
// drawn from, each with the shared card model (cardModel in lib/support/slack.js) so /admin shows
// exactly what Slack shows. Read-only. Used by GET /api/support/fires and the /admin server pages.
// "held" = a failed fire whose customer reply was held because an action failed.
import { neon } from '@neondatabase/serverless';
import { cardModel } from '@/lib/support/slack';
import { playOf } from '@/lib/support/fire';

const sql = neon(process.env.DATABASE_URL);
export const FIRE_STATUSES = ['posted', 'scheduled', 'firing', 'fired', 'failed', 'held', 'cancelled', 'rejected'];

export async function listFires({ status = '', caseId = null, limit = 100 } = {}) {
  if (status && !FIRE_STATUSES.includes(status)) throw new Error('bad status');
  const dbStatus = status === 'held' ? 'failed' : (status || null);
  const lim = Math.min(Number(limit) || 100, 300);
  const rows = await sql`
    SELECT * FROM support_fires
    WHERE (${dbStatus}::text IS NULL OR status = ${dbStatus})
      AND (${caseId ? Number(caseId) : null}::int IS NULL OR case_id = ${caseId ? Number(caseId) : null})
    ORDER BY id DESC LIMIT ${lim}`;
  const fires = rows.map((f) => {
    const result = typeof f.result === 'string' ? JSON.parse(f.result) : f.result;
    return {
      id: f.id, status: f.status, held: result?.held || null, member_email: f.member_email, case_id: f.case_id,
      thread_ts: f.thread_ts, fire_at: f.fire_at, created_at: f.created_at, updated_at: f.updated_at,
      onSlack: !!(f.channel && f.thread_ts), result: result || null, card: cardModel(f, playOf(f)),
    };
  });
  return status === 'held' ? fires.filter((f) => f.held) : fires;
}
