/**
 * /api/user/workout/autopilot — Neon replacement for the AWS /auto-pilot/* endpoints
 * (White Board). Day docs in user_logs section='autopilot'; level + favorites in
 * user_setting type='autopilot_state'.
 *
 * GET  ?userId=&weekStart=YYYY-MM-DD[&today=YYYY-MM-DD]
 *      -> { firstName, lastName, startDate, endDate, todaysDate, dayView:{ "MONDAY,MAY 18": {...}|null } }
 * POST { userId, op, date: YYYY-MM-DD, ... }  op-dispatch, response shapes mirror AWS:
 *      generate | refresh-one | refresh-all | mark-alldone | log |
 *      add-category | delete-category | copy-previous | apply-favorite
 */
import {
    CORS, corsJson, corsOptions,
    isValidIsoDate, weekDatesFrom, isoToDayKey,
    AP_CATEGORIES, AP_BY_ID, pickExercise, hydrateApExercise, repsOrSecsDisplay,
    getUserName, readWorkoutState, writeWorkoutState,
    readDayDoc, readWeekDocs, writeDayDoc, nextSlotId,
    PREVIOUS_DAY_SENTINEL, findPreviousDayDoc,
} from "@/lib/workout";
import { logger } from "@/lib/logger";

export async function OPTIONS() { return corsOptions(); }

const emptyApDay = doc => !doc || !(doc.exercises || []).length;

function hydrateDay(doc) {
    if (emptyApDay(doc)) return null;
    const exerciseListForDay = (doc.exercises || [])
        .map(s => hydrateApExercise(s, doc.rounds))
        .filter(Boolean);
    return {
        favoriteId: doc.favoriteId ?? null,
        exerciseListForDay,
        rounds: doc.rounds ?? 3,
        isLogged: !!doc.isLogged && exerciseListForDay.every(e => e.isLogged),
    };
}

async function userApLevel(userId) {
    const { data } = await readWorkoutState(userId, 'autopilot_state');
    const lvl = Number(data?.level);
    return Number.isFinite(lvl) && lvl >= 1 ? lvl : 1;
}

// Build a fresh generated day-doc: one exercise per category.
function generateDoc(level, rounds, existingDoc) {
    const used = new Set();
    const exercises = [];
    let slot = nextSlotId(existingDoc?.exercises);
    for (const category of AP_CATEGORIES) {
        const pick = pickExercise(category, level, used);
        if (!pick) continue;
        used.add(pick.autoPilotExerciseId);
        exercises.push({
            slotId: slot++,
            autoPilotExerciseId: pick.autoPilotExerciseId,
            rounds,
            isLogged: false,
            secsOrReps: repsOrSecsDisplay(pick.secsOrReps),
        });
    }
    return { seeded: false, rounds, isLogged: false, favoriteId: null, exercises };
}

export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams;
        const userId = p.get('userId');
        const weekStart = p.get('weekStart');
        if (!userId || !isValidIsoDate(weekStart)) {
            return corsJson({ error: 'userId and weekStart=YYYY-MM-DD required' }, 400);
        }
        const dates = weekDatesFrom(weekStart);
        const [docs, names] = await Promise.all([
            readWeekDocs(userId, 'autopilot', dates),
            getUserName(userId),
        ]);
        const dayView = {};
        for (const d of dates) dayView[isoToDayKey(d)] = hydrateDay(docs[d]);
        const today = p.get('today');
        return corsJson({
            firstName: names.firstName,
            lastName: names.lastName,
            startDate: dates[0],
            endDate: dates[6],
            todaysDate: isValidIsoDate(today) ? today : new Date().toISOString().slice(0, 10),
            dayView,
        });
    } catch (error) {
        logger.error('workout.autopilot.error', { userId: request.nextUrl.searchParams.get('userId'), method: 'GET', error });
        return corsJson({ error: error.message }, 400);
    }
}

export async function POST(request) {
    let logCtx = {};
    try {
        const json = await request.json();
        const { userId, op, date } = json;
        logCtx = { userId, op };
        if (!userId || !op) return corsJson({ error: 'userId and op required' }, 400);

        if (op === 'set-level') {
            // White Board level modal (EditCatModal): persist the user's AP level. No date.
            const lvl = Number(json.level);
            // 1-4 = specific levels; 5 = "All" (the slider's top notch) — generate then
            // draws from every level (pickExercise treats level 5 as no at-level pool).
            if (!Number.isFinite(lvl) || lvl < 1 || lvl > 5) return corsJson({ error: 'level 1-5 required' }, 400);
            const { data: state } = await readWorkoutState(userId, 'autopilot_state');
            await writeWorkoutState(userId, 'autopilot_state', { ...(state || {}), level: lvl });
            return corsJson({ status: 200 });
        }

        if (!isValidIsoDate(date)) {
            return corsJson({ error: 'date=YYYY-MM-DD required' }, 400);
        }

        const doc = await readDayDoc(userId, 'autopilot', date);
        const rounds = Number(json.rounds) || doc?.rounds || 3;

        switch (op) {
            case 'generate': {
                const level = await userApLevel(userId);
                const fresh = generateDoc(level, rounds, doc);
                await writeDayDoc(userId, 'autopilot', date, fresh);
                return corsJson(fresh.exercises.map(s => hydrateApExercise(s, rounds)));
            }

            case 'refresh-one': {
                if (emptyApDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                const slot = doc.exercises.find(s => s.slotId === Number(json.autoPilotId));
                if (!slot) return corsJson({ error: 'autoPilotId not found' }, 400);
                const level = await userApLevel(userId);
                const used = new Set(doc.exercises.map(s => s.autoPilotExerciseId));
                const cat = AP_BY_ID.get(slot.autoPilotExerciseId);
                const pick = pickExercise(cat?.category, level, used) || AP_BY_ID.get(slot.autoPilotExerciseId);
                slot.autoPilotExerciseId = pick.autoPilotExerciseId;
                slot.isLogged = false;
                slot.rounds = rounds;
                slot.secsOrReps = repsOrSecsDisplay(pick.secsOrReps);
                await writeDayDoc(userId, 'autopilot', date, doc);
                return corsJson([hydrateApExercise(slot, doc.rounds)]);
            }

            case 'refresh-all': {
                if (emptyApDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                const level = await userApLevel(userId);
                const targets = new Set((json.autoPilotIds || []).map(Number));
                const used = new Set(doc.exercises.map(s => s.autoPilotExerciseId));
                const replaced = [];
                for (const slot of doc.exercises) {
                    if (!targets.has(slot.slotId)) continue;
                    const cat = AP_BY_ID.get(slot.autoPilotExerciseId);
                    const pick = pickExercise(cat?.category, level, used);
                    if (!pick) continue;
                    used.add(pick.autoPilotExerciseId);
                    slot.autoPilotExerciseId = pick.autoPilotExerciseId;
                    slot.isLogged = false;
                    slot.rounds = rounds;
                    slot.secsOrReps = repsOrSecsDisplay(pick.secsOrReps);
                    replaced.push(slot);
                }
                doc.rounds = rounds;
                await writeDayDoc(userId, 'autopilot', date, doc);
                return corsJson(replaced.map(s => hydrateApExercise(s, doc.rounds)));
            }

            case 'mark-alldone': {
                if (emptyApDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                const items = new Map((json.items || []).map(i => [Number(i.autoPilotId), i]));
                for (const slot of doc.exercises) {
                    const item = items.get(slot.slotId);
                    slot.isLogged = true;
                    if (item?.secsOrReps) slot.secsOrReps = item.secsOrReps;
                    if (item?.rounds) slot.rounds = Number(item.rounds);
                }
                doc.isLogged = true;
                await writeDayDoc(userId, 'autopilot', date, doc);
                return corsJson({ status: 200 });
            }

            case 'log': {
                if (emptyApDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                const slot = doc.exercises.find(s => s.slotId === Number(json.autoPilotId));
                if (!slot) return corsJson({ error: 'autoPilotId not found' }, 400);
                slot.isLogged = true;
                if (json.secsOrReps) slot.secsOrReps = json.secsOrReps;
                if (json.rounds) slot.rounds = Number(json.rounds);
                doc.isLogged = doc.exercises.every(s => s.isLogged);
                await writeDayDoc(userId, 'autopilot', date, doc);
                return corsJson({ status: 200 });
            }

            case 'add-category': {
                const base = emptyApDay(doc) ? { seeded: false, rounds, isLogged: false, favoriteId: null, exercises: [] } : doc;
                const level = await userApLevel(userId);
                const used = new Set(base.exercises.map(s => s.autoPilotExerciseId));
                const pick = pickExercise(json.category, level, used);
                if (!pick) return corsJson({ error: `no exercise available in category ${json.category}` }, 400);
                const slot = {
                    slotId: nextSlotId(base.exercises),
                    autoPilotExerciseId: pick.autoPilotExerciseId,
                    rounds,
                    isLogged: false,
                    secsOrReps: repsOrSecsDisplay(pick.secsOrReps),
                };
                base.exercises.push(slot);
                base.isLogged = false;
                await writeDayDoc(userId, 'autopilot', date, base);
                return corsJson([hydrateApExercise(slot, base.rounds)]);
            }

            case 'delete-category': {
                if (emptyApDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                doc.exercises = doc.exercises.filter(s => s.slotId !== Number(json.autoPilotId));
                await writeDayDoc(userId, 'autopilot', date, doc);
                return corsJson({ status: 200 });
            }

            case 'copy-previous': {
                const prev = await findPreviousDayDoc(userId, 'autopilot', date, emptyApDay);
                if (!prev) return corsJson(PREVIOUS_DAY_SENTINEL);
                const copy = {
                    seeded: false,
                    rounds: prev.doc.rounds ?? 3,
                    isLogged: false,
                    favoriteId: null,
                    exercises: prev.doc.exercises.map((s, i) => ({
                        slotId: i + 1,
                        autoPilotExerciseId: s.autoPilotExerciseId,
                        rounds: s.rounds ?? prev.doc.rounds ?? 3,
                        isLogged: false,
                        secsOrReps: s.secsOrReps,
                    })),
                };
                await writeDayDoc(userId, 'autopilot', date, copy);
                return corsJson(copy.exercises.map(s => hydrateApExercise(s, copy.rounds)));
            }

            case 'apply-favorite': {
                const { data } = await readWorkoutState(userId, 'autopilot_state');
                const fav = (data?.favorites || []).find(f => f.favoriteId === Number(json.favoriteId));
                if (!fav) return corsJson({ error: 'favorite not found' }, 400);
                const ids = String(fav.exerciseIds || '').split(',').map(s => Number(s.trim())).filter(Boolean);
                const exercises = [];
                let slot = 1;
                for (const id of ids) {
                    const cat = AP_BY_ID.get(id);
                    if (!cat) continue;
                    exercises.push({
                        slotId: slot++,
                        autoPilotExerciseId: id,
                        rounds,
                        isLogged: false,
                        secsOrReps: repsOrSecsDisplay(cat.secsOrReps),
                    });
                }
                const fresh = { seeded: false, rounds, isLogged: false, favoriteId: fav.favoriteId, exercises };
                await writeDayDoc(userId, 'autopilot', date, fresh);
                return corsJson(fresh.exercises.map(s => hydrateApExercise(s, rounds)));
            }

            default:
                return corsJson({ error: `unknown op: ${op}` }, 400);
        }
    } catch (error) {
        logger.error('workout.autopilot.error', { ...logCtx, method: 'POST', error });
        return corsJson({ error: error.message }, 400);
    }
}
