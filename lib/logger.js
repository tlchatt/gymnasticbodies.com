const ENABLED = process.env.LOG_ENABLED !== 'false';
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, event, data = {}) {
    if (!ENABLED) return;
    if (LEVELS[level] < MIN_LEVEL) return;
    const entry = { ts: new Date().toISOString(), level, event, ...data };
    if (data.error instanceof Error) {
        entry.error = { message: data.error.message, stack: data.error.stack };
    }
    console.log(JSON.stringify(entry));
}

export const logger = {
    info:  (event, data) => log('info',  event, data),
    warn:  (event, data) => log('warn',  event, data),
    error: (event, data) => log('error', event, data),
};
