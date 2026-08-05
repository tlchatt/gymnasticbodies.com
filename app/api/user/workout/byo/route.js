/**
 * /api/user/workout/byo — Neon replacement for the AWS /byo/* endpoints (Build Your Own).
 * Day docs in user_logs section='byo'; favorites/settings in user_setting typed rows.
 *
 * Day-doc shape:
 *   { seeded?, favoriteId, items: [{ slotId, id, orderingType, isLogged,
 *       rounds?, numOfSecsOrRepsLogged?,             // Exercise items
 *       programProgress?: { exercises: [{ exerciseId, status, imStatus, orderNum,
 *           masterySetId, notes, reps: [{sets, repsCompleted}] }] }  // Program items
 *   }] }
 *
 * Item type dispatch (legacy semantics): id ∈ PROGRAM_IDS -> 'Program';
 * id ∈ byoWorkouts classIds -> 'Class'; else -> 'Exercise' (autopilot catalog exerciseId).
 *
 * GET  ?userId=&weekStart=            -> day-keyed weekly view (AWS shape)
 * GET  ?userId=&op=program-status&courseId=&weekStart=
 * POST { userId, op, ... } ops: builder-save | builder-delete | log-class | unlog-class |
 *       log-exercises | unlog-exercise | copy-previous | copy-last-week |
 *       program-log | program-notes
 * (Curriculum reads — /byo/workout/{courseId}, edit-workout, difficulty — are served by
 *  the program-detail sub-phase, not this route.)
 */
import {
    corsJson, corsOptions,
    isValidIsoDate, weekDatesFrom, isoToDayKey, addDaysIso,
    AP_BY_ID,
    readDayDoc, readWeekDocs, writeDayDoc, nextSlotId,
    upsertHistoryEntry, removeHistoryEntry,
    PREVIOUS_DAY_SENTINEL, findPreviousDayDoc,
} from "@/lib/workout";
import { PROGRAM_IDS, CLASS_BY_ID, emptyByoDay, itemType, hydrateDay } from "./hydrate.js";
import builderCategories from "@/data/workout/byoBuilderCategories.json";
import { logger } from "@/lib/logger";

export async function OPTIONS() { return corsOptions(); }

async function weeklyView(userId, weekStart) {
    const dates = weekDatesFrom(weekStart);
    const docs = await readWeekDocs(userId, 'byo', dates);
    const out = {};
    dates.forEach((d, i) => { out[isoToDayKey(d)] = hydrateDay(docs[d], i); });
    return out;
}

// History write-through helpers (BYO activity IS part of legacy workout history)
function historyEntryFor(id) {
    const type = itemType(id);
    if (type === 'Class') {
        const w = CLASS_BY_ID.get(Number(id));
        return { courseName: w.className, courseIcon: w.image || '', type: 'Class', level: '', source: 'byo-class', refId: id };
    }
    if (type === 'Program') {
        return { courseName: PROGRAM_IDS[id], courseIcon: PROGRAM_IDS[id].split(' ').map(s => s[0]).join(''), type: 'Programs', level: 'BYO', source: 'byo-class', refId: id };
    }
    const cat = AP_BY_ID.get(Number(id));   // BYO exercise id == autoPilotExerciseId
    return { courseName: cat ? cat.exerciseName : `Exercise ${id}`, courseIcon: '', type: 'Exercise', level: '', source: 'byo-exercise', refId: id };
}

export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams;

        // Builder category picker — static catalog captured from live AWS
        // (user-independent, so no userId/weekStart required).
        if (p.get('op') === 'builder-category') {
            return corsJson(builderCategories[p.get('categoryId')] || {});
        }

        const userId = p.get('userId');
        const weekStart = p.get('weekStart');
        if (!userId || !isValidIsoDate(weekStart)) {
            return corsJson({ error: 'userId and weekStart=YYYY-MM-DD required' }, 400);
        }

        if (p.get('op') === 'program-status') {
            const courseId = Number(p.get('courseId'));
            const dates = weekDatesFrom(weekStart);
            const docs = await readWeekDocs(userId, 'byo', dates);
            const out = {};
            for (const d of dates) {
                const item = (docs[d]?.items || []).find(it => Number(it.id) === courseId);
                if (item) out[isoToDayKey(d)] = { classOrProgOrExId: courseId, isLogged: !!item.isLogged };
            }
            return corsJson(out);
        }

        return corsJson(await weeklyView(userId, weekStart));
    } catch (error) {
        logger.error('workout.byo.error', { userId: request.nextUrl.searchParams.get('userId'), method: 'GET', error });
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
        if (op !== 'copy-last-week' && !isValidIsoDate(date)) {
            return corsJson({ error: 'date=YYYY-MM-DD required' }, 400);
        }
        const doc = op === 'copy-last-week' ? null : await readDayDoc(userId, 'byo', date);
        const dayIndex = json.dayIndex ?? 0;

        switch (op) {
            case 'builder-save': {
                // Replaces the day's item list; logged state kept for retained (id, orderingType) pairs.
                // The my. frontend sends classOrExerciseInfoList (legacy AWS body field name).
                const prevLogged = new Map((doc?.items || []).map(it => [`${it.id}|${it.orderingType}`, it]));
                let slot = nextSlotId(doc?.items);
                const items = (json.items || json.classOrExerciseInfoList || []).map(entry => {
                    const id = Number(entry.classOrProgramOrExId ?? entry.id);
                    const orderingType = Number(entry.orderingType);
                    const prev = prevLogged.get(`${id}|${orderingType}`);
                    return prev || {
                        slotId: slot++,
                        id,
                        orderingType,
                        isLogged: false,
                    };
                });
                const fresh = { seeded: false, favoriteId: doc?.favoriteId ?? null, items };
                await writeDayDoc(userId, 'byo', date, fresh);
                return corsJson(hydrateDay(fresh, dayIndex) || { favoriteId: null, workoutsInADayList: [] });
            }

            case 'builder-delete': {
                await writeDayDoc(userId, 'byo', date, { seeded: false, favoriteId: null, items: [] });
                return corsJson({ status: 200 });
            }

            case 'log-class':
            case 'unlog-class': {
                if (emptyByoDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                const classId = Number(json.classId);
                const logged = op === 'log-class';
                let touched = false;
                for (const it of doc.items) {
                    if (Number(it.id) === classId && itemType(it.id) !== 'Exercise') {
                        it.isLogged = logged;
                        touched = true;
                    }
                }
                if (!touched) return corsJson({ error: 'classId not on this day' }, 400);
                await writeDayDoc(userId, 'byo', date, doc);
                if (logged) await upsertHistoryEntry(userId, date, historyEntryFor(classId));
                else await removeHistoryEntry(userId, date, 'byo-class', classId);
                return corsJson({ status: 200 });
            }

            case 'log-exercises': {
                if (emptyByoDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                // Accept the AWS single-log body ({exerciseId, rounds, numOfSecsOrReps}) or a batch.
                const logs = json.exercises || [{ exerciseId: json.exerciseId, rounds: json.rounds, numOfSecsOrReps: json.numOfSecsOrReps }];
                for (const log of logs) {
                    const exId = Number(log.exerciseId);
                    for (const it of doc.items) {
                        if (Number(it.id) === exId && itemType(it.id) === 'Exercise') {
                            it.isLogged = true;
                            if (log.rounds !== undefined) it.rounds = Number(log.rounds);
                            if (log.numOfSecsOrReps !== undefined) it.numOfSecsOrRepsLogged = log.numOfSecsOrReps;
                        }
                    }
                    await upsertHistoryEntry(userId, date, historyEntryFor(exId));
                }
                await writeDayDoc(userId, 'byo', date, doc);
                return corsJson({ status: 200 });
            }

            case 'unlog-exercise': {
                if (emptyByoDay(doc)) return corsJson({ error: 'no workout for date' }, 400);
                const exId = Number(json.exerciseId);
                for (const it of doc.items) {
                    if (Number(it.id) === exId && itemType(it.id) === 'Exercise') {
                        it.isLogged = false;
                        it.numOfSecsOrRepsLogged = null;
                    }
                }
                await writeDayDoc(userId, 'byo', date, doc);
                await removeHistoryEntry(userId, date, 'byo-exercise', exId);
                return corsJson({ status: 200 });
            }

            case 'copy-previous': {
                const prev = await findPreviousDayDoc(userId, 'byo', date, emptyByoDay);
                if (!prev) return corsJson(PREVIOUS_DAY_SENTINEL);
                const copy = {
                    seeded: false,
                    favoriteId: prev.doc.favoriteId ?? null,
                    items: prev.doc.items.map((it, i) => ({
                        slotId: i + 1, id: it.id, orderingType: it.orderingType, isLogged: false,
                    })),
                };
                await writeDayDoc(userId, 'byo', date, copy);
                return corsJson(hydrateDay(copy, dayIndex));
            }

            case 'copy-last-week': {
                const weekStart = json.weekStart;
                if (!isValidIsoDate(weekStart)) return corsJson({ error: 'weekStart required' }, 400);
                const thisWeek = weekDatesFrom(weekStart);
                const lastWeek = weekDatesFrom(addDaysIso(weekStart, -7));
                const lastDocs = await readWeekDocs(userId, 'byo', lastWeek);
                for (let i = 0; i < 7; i++) {
                    const src = lastDocs[lastWeek[i]];
                    if (emptyByoDay(src)) continue;
                    await writeDayDoc(userId, 'byo', thisWeek[i], {
                        seeded: false,
                        favoriteId: src.favoriteId ?? null,
                        items: src.items.map((it, j) => ({
                            slotId: j + 1, id: it.id, orderingType: it.orderingType, isLogged: false,
                        })),
                    });
                }
                return corsJson(await weeklyView(userId, weekStart));
            }

            case 'program-log': {
                // handleLegacyLog: per-exercise program progress on the day's Program item.
                // section 'byo' = a built BYO day; section 'levels' = a Guided-Plans day
                // (virtual — the program item is auto-created since there's no builder).
                const sec = json.section === 'levels' ? 'levels' : 'byo';
                const secDoc = sec === 'byo' ? doc : (await readDayDoc(userId, sec, date)) || { items: [] };
                const courseId = Number(json.courseId ?? json.workoutType);
                let item = secDoc.items.find(it => Number(it.id) === courseId);
                if (!item) {
                    if (sec !== 'levels') return corsJson({ error: 'program not on this day' }, 400);
                    item = { id: courseId, orderingType: 13, isLogged: false };
                    secDoc.items.push(item);
                }
                item.programProgress = item.programProgress || { exercises: [] };
                const exId = Number(json.exerciseId);
                const reps = (json.setsAndRepsDTOList || []).map(r => ({ sets: Number(r.sets), repsCompleted: Number(r.repsCompleted) }));
                const entry = {
                    exerciseId: exId,
                    status: json.status !== undefined ? json.status : 100,
                    imStatus: json.imStatus ?? 0,
                    orderNum: json.orderNum ?? null,
                    masterySetId: json.masterySets?.masterySetId ?? json.masterySetId ?? null,
                    notes: json.notes ?? null,
                    reps,
                };
                const idx = item.programProgress.exercises.findIndex(e => Number(e.exerciseId) === exId);
                if (idx >= 0) item.programProgress.exercises[idx] = { ...item.programProgress.exercises[idx], ...entry };
                else item.programProgress.exercises.push(entry);
                await writeDayDoc(userId, sec, date, secDoc);
                await upsertHistoryEntry(userId, date, historyEntryFor(courseId));
                return corsJson({ status: 200 });
            }

            case 'program-notes': {
                const sec = json.section === 'levels' ? 'levels' : 'byo';
                const secDoc = sec === 'byo' ? doc : (await readDayDoc(userId, sec, date)) || { items: [] };
                const courseId = Number(json.courseId ?? json.workoutType);
                let item = secDoc.items.find(it => Number(it.id) === courseId);
                if (!item) {
                    if (sec !== 'levels') return corsJson({ error: 'program not on this day' }, 400);
                    item = { id: courseId, orderingType: 13, isLogged: false };
                    secDoc.items.push(item);
                }
                item.programProgress = item.programProgress || { exercises: [] };
                const exId = Number(json.exerciseId);
                const idx = item.programProgress.exercises.findIndex(e => Number(e.exerciseId) === exId);
                if (idx >= 0) item.programProgress.exercises[idx].notes = json.notes ?? null;
                else item.programProgress.exercises.push({ exerciseId: exId, notes: json.notes ?? null, reps: [] });
                await writeDayDoc(userId, sec, date, secDoc);
                return corsJson({ status: 200 });
            }

            default:
                return corsJson({ error: `unknown op: ${op}` }, 400);
        }
    } catch (error) {
        logger.error('workout.byo.error', { ...logCtx, method: 'POST', error });
        return corsJson({ error: error.message }, 400);
    }
}
