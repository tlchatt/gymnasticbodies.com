// Billing reminder emails — lib/billingReminders.js has the rules.
//   ?run=trial     hourly: "Your trial activates tomorrow"
//   ?run=billing   daily:  "Your next payment is on {date}" (monthly / credit / yearly)
//   &dryRun=1      sends nothing; lists who would get one and who is skipped, by rule
//   ?test=<email>&type=trial|monthly|credit|yearly   ONE test email to that address
//   &preview=1     return that test email (with its live sign-in link) instead of sending it
// Members are only emailed when BILLING_REMINDERS_LIVE=true; until then every run is a dry run.
// Requires the cron secret (Vercel cron sends it) or an admin session.
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireAdminOrCronSecret } from '@/lib/adminAuth';
import { runReminders, sendTestReminder } from '@/lib/billingReminders';

export const maxDuration = 300;

const TYPES = ['trial', 'monthly', 'credit', 'yearly'];

export async function GET(request) {
    const denied = await requireAdminOrCronSecret(request);
    if (denied) return denied;
    const params = new URL(request.url).searchParams;

    const test = params.get('test');
    if (test) {
        const type = params.get('type');
        if (!TYPES.includes(type)) return NextResponse.json({ error: `type must be one of ${TYPES.join(', ')}` }, { status: 400 });
        try {
            const preview = params.get('preview') === '1';
            const result = await sendTestReminder({ to: test, type, preview });
            if (!preview) logger.info('billing_reminder.test_sent', { email: test, type, withLink: result.withLink });
            return NextResponse.json(result);
        } catch (err) {
            logger.error('billing_reminder.test_failed', { email: test, type, error: err?.message });
            return NextResponse.json({ error: err?.message }, { status: 500 });
        }
    }

    const run = params.get('run');
    if (!['trial', 'billing'].includes(run)) return NextResponse.json({ error: 'run must be trial or billing' }, { status: 400 });
    const dryRun = params.get('dryRun') === '1';
    try {
        const result = await runReminders({ run, dryRun });
        logger.info('billing_reminder.run', { run, live: result.live, gate: result.gate, due: result.due, skipped: result.skipped,
            sent: result.results.filter((r) => r.status === 'sent').length, failed: result.results.filter((r) => r.status === 'failed').length });
        return NextResponse.json(result);
    } catch (err) {
        logger.error('billing_reminder.run_failed', { run, error: err?.message });
        return NextResponse.json({ error: err?.message }, { status: 500 });
    }
}
