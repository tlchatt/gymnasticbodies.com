import { db } from '@/Drizzle/index.ts';
import { app_logs } from '@/Drizzle/db/schema';

const ENABLED = process.env.LOG_ENABLED !== 'false';
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, event, data = {}) {
    if (!ENABLED) return;
    if (LEVELS[level] < MIN_LEVEL) return;

    const { error, email, userId, source, ...rest } = data;
    const entry = { ts: new Date().toISOString(), level, event, ...(email && { email }), ...(source && { source }), ...rest };

    if (error instanceof Error) {
        entry.error = { message: error.message, stack: error.stack };
        rest.error = entry.error;
    } else if (error !== undefined) {
        entry.error = error;
        rest.error = error;
    }

    console.log(JSON.stringify(entry));

    db.insert(app_logs).values({
        level,
        event,
        email: email ?? null,
        userId: userId ?? null,
        source: source ?? 'app.gymnasticbodies.com',
        data: Object.keys(rest).length > 0 ? rest : null,
    }).catch(() => {});
}

export const logger = {
    info:  (event, data) => log('info',  event, data),
    warn:  (event, data) => log('warn',  event, data),
    error: (event, data) => log('error', event, data),
};
