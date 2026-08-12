/**
 * lib/workout.js — shared helpers for the /api/user/workout/* routes (AWS→Neon migration).
 *
 * Storage model:
 *   - per-day docs in user_logs keyed (userId, userScheduleDate ISO, section)
 *   - standing per-user state in user_setting typed rows (JSON string in `data`)
 *   - static catalogs imported from data/workout/*.json (built by claudeTools/buildWorkoutCatalogs.js)
 *
 * Response contracts intentionally mirror the legacy AWS API shapes byte-for-byte where
 * the frontend depends on them (day keys "MONDAY,MAY 18", repsOrSecs "15s"/"5r", etc).
 */
import { db } from "@/Drizzle/index.ts";
import { user, user_setting, user_logs } from "@/Drizzle/db/schema";
import { eq, and, gte, lt, inArray } from 'drizzle-orm';
import { queryUserSetting, queryUserLogsForDate, queryUserLogsForDates, upsertUserLog } from "@/lib/userSettings";
import autopilotCatalog from "@/data/workout/autopilotCatalog.json";

// ---------------------------------------------------------------------------
// CORS (per-route pattern — support-history style; NOT the next.config registry)
export const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
export function corsJson(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS },
    });
}
export function corsOptions() {
    return new Response(null, { status: 204, headers: CORS });
}

// ---------------------------------------------------------------------------
// Dates. All server-side date math is done in UTC on ISO YYYY-MM-DD strings —
// the frontend supplies weekStart (it owns the user's timezone via moment-timezone).
const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTH_NAMES = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export function isValidIsoDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
}

export function addDaysIso(iso, days) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

// "2026-05-18" -> "MONDAY,MAY 18"  (legacy AWS day-key format the frontend consumes)
export function isoToDayKey(iso) {
    const d = new Date(iso + 'T00:00:00Z');
    return `${DAY_NAMES[d.getUTCDay()]},${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

// Some client paths (ManageDificultyNew, LogLegacyNew, SaveNotesLevelsNew and the
// beginner-plan log/unlog thunks) POST /api/user/log with the display day-key as
// user_schedule_date instead of an ISO date. 650 rows across 160 users are stored that
// way, in two spellings: "FRIDAY,JULY 24" and "Friday, April 03". Reads keyed on ISO
// cannot see them, so every lookup accepts both. A day-key carries no year, which is
// tolerable while these rows all sit in one year but is why writes should normalise.
const DAY_TITLE = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_TITLE = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function dateKeyVariants(iso) {
    if (!isValidIsoDate(iso)) return [iso];
    const d = new Date(iso + 'T00:00:00Z');
    const du = DAY_NAMES[d.getUTCDay()], mu = MONTH_NAMES[d.getUTCMonth()];
    const dt = DAY_TITLE[d.getUTCDay()], mt = MONTH_TITLE[d.getUTCMonth()];
    const n = d.getUTCDate(), p = String(n).padStart(2, '0');
    return [iso, `${du},${mu} ${n}`, `${du},${mu} ${p}`, `${dt}, ${mt} ${p}`, `${dt}, ${mt} ${n}`];
}

// weekStart (ISO Monday) -> the 7 ISO dates of that week
export function weekDatesFrom(weekStart) {
    return Array.from({ length: 7 }, (_, i) => addDaysIso(weekStart, i));
}

// ---------------------------------------------------------------------------
// AutoPilot catalog indexes
export const AP_BY_ID = new Map(autopilotCatalog.map(e => [e.autoPilotExerciseId, e]));
export const AP_BY_EXERCISE_ID = new Map(autopilotCatalog.map(e => [e.exerciseId, e]));
export const AP_CATEGORIES = [...new Set(autopilotCatalog.map(e => e.category))];

// ref secsOrReps ("5 Sec" / "5 Rep" / bare "Rep" / bare "Sec") -> display ("5s" / "5r").
// Bare unit values (no number) exist in the catalog — legacy UI defaulted those to 5.
export function repsOrSecsDisplay(secsOrReps) {
    const s = String(secsOrReps || '');
    const m = /(\d+)?\s*(sec|rep)/i.exec(s);
    if (m) return `${m[1] || 5}${m[2].toLowerCase().startsWith('s') ? 's' : 'r'}`;
    return s;
}

// Weighted exercise pick for generate/refresh: ~80% at the user's level, ~20% one of
// the lower levels (observed AWS behavior — an intermediate week mixes lower-level work).
export function pickExercise(category, level, excludeIds = new Set()) {
    const inCat = autopilotCatalog.filter(e => e.category === category && !excludeIds.has(e.autoPilotExerciseId));
    if (!inCat.length) return null;
    const atLevel = inCat.filter(e => e.levelId === level);
    const below = inCat.filter(e => e.levelId < level);
    let pool;
    if (atLevel.length && below.length) pool = Math.random() < 0.8 ? atLevel : below;
    else pool = atLevel.length ? atLevel : (below.length ? below : inCat);
    return pool[Math.floor(Math.random() * pool.length)];
}

// Hydrate one autopilot day-doc exercise slot into the legacy AWS response item.
export function hydrateApExercise(slot, dayRounds) {
    const cat = AP_BY_ID.get(slot.autoPilotExerciseId);
    if (!cat) return null;
    return {
        category: cat.category,
        exerciseName: cat.exerciseName,
        autoPilotExerciseId: cat.autoPilotExerciseId,
        imageUrl: cat.imageUrl,
        repsOrSecs: slot.secsOrReps || repsOrSecsDisplay(cat.secsOrReps),
        autoPilotId: slot.slotId,                 // stable per-day slot id (AWS: daily-view row id)
        levelId: cat.levelId,
        rounds: slot.rounds ?? dayRounds ?? 3,
        isLogged: !!slot.isLogged,
        exerciseFocusPoints: (cat.focusPoints || []).map(f => ({ description: f.description, descOrder: f.descOrder })),
        videos: (cat.videos || []).map(v => ({ mediaId: v.mediaId, version: v.version })),
    };
}

// ---------------------------------------------------------------------------
// User identity
export async function getUserName(userId) {
    const rows = await db.select({ name: user.name }).from(user).where(eq(user.id, userId));
    const name = rows[0]?.name || '';
    const [firstName, ...rest] = name.split(' ');
    return { firstName: firstName || '', lastName: rest.join(' ') };
}

// ---------------------------------------------------------------------------
// Standing state — user_setting typed rows. `data` is a text column; we store JSON
// strings and read tolerantly (some legacy rows hold driver-serialized objects).
export function parseSettingData(row) {
    if (!row || row.data == null) return null;
    if (typeof row.data === 'object') return row.data;
    try { return JSON.parse(row.data); } catch { return null; }
}

export async function readWorkoutState(userId, type) {
    const row = await queryUserSetting(userId, type);
    return { row, data: parseSettingData(row) };
}

// The seeder marks everything it writes {"seeded": true} and re-seeds ONLY those rows
// (`WHERE data->>'seeded' = 'true'`), so that a member's own work is never clobbered.
// But every edit path here reads the row and writes back `{ ...(data || {}), ...changes }`,
// which carries the flag forward — so a member's edit stayed labelled seed-owned and the
// next re-seed silently reverted it. Anything written through the app is by definition
// live, so the flag is dropped here, once, rather than at each of the call sites.
const dropSeedFlag = obj => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || !('seeded' in obj)) return obj;
    const { seeded, ...rest } = obj;
    return rest;
};

// A member whose session never resolved its neonUserId sends the literal STRING
// "undefined" (truthy, so the routes' `!userId` guard passes it through). That value
// finds no existing row, so writes fall to the INSERT branch and blow up on the
// user_setting -> user foreign key — silently breaking progression edits, refresh-item,
// log-beginner, etc. Reject it here, once, at the write layer so every op fails cleanly
// (a 400 the route catch turns into a clear error) instead of a raw FK crash.
export function assertValidUserId(userId) {
    if (!userId || userId === 'undefined' || userId === 'null') {
        const e = new Error('unresolved userId — sign out and back in, then try again');
        e.status = 400;
        throw e;
    }
}

export async function writeWorkoutState(userId, type, dataObj) {
    assertValidUserId(userId);
    const existing = await queryUserSetting(userId, type);
    const payload = JSON.stringify(dropSeedFlag(dataObj));
    if (existing) {
        return db.update(user_setting).set({ data: payload }).where(eq(user_setting.id, existing.id)).returning();
    }
    return db.insert(user_setting).values({ userId, type, data: payload }).returning();
}

// ---------------------------------------------------------------------------
// Per-day doc access (thin wrappers so routes read naturally)
export async function readDayDoc(userId, section, isoDate) {
    // One query covering the ISO date and every day-key spelling of it — querying the
    // variants one at a time made a weekly view issue 35 round trips.
    const variants = dateKeyVariants(isoDate);
    const rows = await queryUserLogsForDates(userId, section, variants);
    if (!rows || !rows.length) return null;
    const exact = rows.find(r => r.userScheduleDate === isoDate);
    return (exact || rows[0])?.data || null;
}
export async function readWeekDocs(userId, section, dates) {
    const rows = await queryUserLogsForDates(userId, section, dates);
    const byDate = {};
    for (const r of rows) byDate[r.userScheduleDate] = r.data;
    return byDate;
}
export async function writeDayDoc(userId, section, isoDate, doc) {
    assertValidUserId(userId);
    // Same reasoning as writeWorkoutState: day-doc edits spread the doc they just read,
    // which carries {"seeded": true} onto a member's own change and makes the next
    // re-seed overwrite it. The app never writes seeded data, so drop it here.
    return upsertUserLog({ userId, section, userScheduleDate: isoDate, data: dropSeedFlag(doc) });
}
// Range read on ISO-dated sections (lexicographic compare is date order for YYYY-MM-DD).
// fromIso inclusive, toIso exclusive. Served by the (user_id, section, user_schedule_date) index.
export async function readDocsInRange(userId, section, fromIso, toIso) {
    const isoRows = await db.select().from(user_logs).where(and(
        eq(user_logs.userId, userId),
        eq(user_logs.section, section),
        gte(user_logs.userScheduleDate, fromIso),
        lt(user_logs.userScheduleDate, toIso),
    ));
    // Day-key-dated rows sort nowhere near ISO dates, so the range above misses them.
    // Look them up explicitly and report them under their ISO date, so callers never
    // have to know two conventions exist.
    const byIso = new Map(isoRows.map(r => [r.userScheduleDate, r]));
    const wanted = new Map();
    for (let d = fromIso; d < toIso; d = addDaysIso(d, 1)) {
        if (byIso.has(d)) continue;
        for (const v of dateKeyVariants(d).slice(1)) wanted.set(v, d);
    }
    if (!wanted.size) return isoRows;
    const altRows = await db.select().from(user_logs).where(and(
        eq(user_logs.userId, userId),
        eq(user_logs.section, section),
        inArray(user_logs.userScheduleDate, [...wanted.keys()]),
    ));
    for (const r of altRows) {
        const iso = wanted.get(r.userScheduleDate);
        if (iso && !byIso.has(iso)) byIso.set(iso, { ...r, userScheduleDate: iso });
    }
    return [...byIso.values()];
}

// Next stable slot id within a day-doc (seeded docs carry real AWS row ids, so
// always derive from max rather than a counter).
export function nextSlotId(slots) {
    return (slots || []).reduce((m, s) => Math.max(m, Number(s.slotId) || 0), 0) + 1;
}

// ---------------------------------------------------------------------------
// History docs (section='history'): { seeded?, entries:[{courseName, courseIcon, type,
// level, source, refId, progression?}] }. Entries idempotent-keyed by (source, refId).
// NOTE: AWS /workout-history is sourced from class/program logs only — AutoPilot logging
// intentionally does NOT write history (parity).
export async function upsertHistoryEntry(userId, isoDate, entry) {
    try {
        const doc = (await readDayDoc(userId, 'history', isoDate)) || { entries: [] };
        const entries = doc.entries || [];
        const idx = entries.findIndex(e => e.source === entry.source && String(e.refId) === String(entry.refId));
        if (idx >= 0) entries[idx] = { ...entries[idx], ...entry };
        else entries.push(entry);
        await writeDayDoc(userId, 'history', isoDate, { ...doc, entries });
    } catch (e) {
        // History is derived data — never fail the primary write because of it.
        console.log('history write-through failed:', e.message);
    }
}
export async function removeHistoryEntry(userId, isoDate, source, refId) {
    try {
        const doc = await readDayDoc(userId, 'history', isoDate);
        if (!doc || !doc.entries) return;
        const entries = doc.entries.filter(e => !(e.source === source && String(e.refId) === String(refId)));
        await writeDayDoc(userId, 'history', isoDate, { ...doc, entries });
    } catch (e) {
        console.log('history remove failed:', e.message);
    }
}

export const PREVIOUS_DAY_SENTINEL = "There is no previous day's workout";

// Search back up to `maxBack` days before isoDate for the latest non-empty day-doc.
export async function findPreviousDayDoc(userId, section, isoDate, isEmpty, maxBack = 14) {
    const dates = Array.from({ length: maxBack }, (_, i) => addDaysIso(isoDate, -(i + 1)));
    const docs = await readWeekDocs(userId, section, dates);
    for (const d of dates) {
        const doc = docs[d];
        if (doc && !isEmpty(doc)) return { date: d, doc };
    }
    return null;
}
