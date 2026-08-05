/**
 * /api/user/workout/levels — Neon replacement for AWS Guided-Plans
 * (/myschedule/levels/*). Schedule from the user's own stored week when they have one
 * (user_setting levels_schedule, seeded from AWS schedule_level_plans/schedule_classes),
 * otherwise the static levelSchedules.json catalog for their level. Program items
 * hydrated via the shared curriculum
 * (lib/curriculum.buildCourseView); per-user logged state from user_logs section 'levels'.
 *
 * GET ?userId=&level=&weekStart=YYYY-MM-DD   -> AWS-parity day-keyed weekly view:
 *     { "MONDAY,JULY 20": [ {scheduleId, classId, type, dayIndex, workout:{...}} ], ... }
 * GET ?op=lastViewed&userId=                 -> { lastLoginLevel }
 * POST { userId, op:'choose-level', level }  -> persists chosen level; { lastLoginLevel }
 */
import {
    corsJson, corsOptions, isValidIsoDate, weekDatesFrom, isoToDayKey,
    readWorkoutState, writeWorkoutState, readDayDoc, writeDayDoc,
} from "@/lib/workout";
import { buildCourseView, isProgramId } from "@/lib/curriculum";
import { logger } from "@/lib/logger";
import levelSchedules from "@/data/workout/levelSchedules.json";
import byoWorkouts from "@/data/workout/byoWorkouts.json";
import beginnerPlans from "@/data/workout/beginnerPlans.json";

export async function OPTIONS() { return corsOptions(); }

// Deterministic, stable schedule id per (level, dayIndex, classId) — the frontend uses
// it to match logged state and to target delete/switch ops.
const schedId = (level, dayIndex, classId) => Number(level) * 10000000 + dayIndex * 100000 + Number(classId);

const LEVEL_NAMES = { 0: 'Beginner', 1: 'Intermediate One', 2: 'Intermediate Two', 3: 'Advanced One', 4: 'Advanced Two' };

// classId -> display metadata, gathered from every level template plus the BYO class
// catalog. A user's stored week holds bare classIds, so it is rehydrated through this.
const CLASS_META = new Map();
for (const lvl of Object.keys(levelSchedules)) {
    for (const di of Object.keys(levelSchedules[lvl])) {
        for (const it of levelSchedules[lvl][di]) {
            if (!CLASS_META.has(Number(it.classId))) CLASS_META.set(Number(it.classId), it);
        }
    }
}
for (const w of byoWorkouts) {
    const id = Number(w.classId);
    if (id && !CLASS_META.has(id)) {
        CLASS_META.set(id, {
            classId: id, type: 'Class', className: w.className || '',
            trainingType: w.category || '', mediaId: w.mediaId || '',
            image: w.image || '', description: w.description || '',
        });
    }
}

// The week to render. AWS stored a per-user recurring template (dayIndex -> classes) and
// let people edit it, so that is authoritative when present; levelSchedules.json is only
// the starting point for users who never customised theirs.
async function scheduleForUser(userId, level) {
    const { data } = await readWorkoutState(userId, 'levels_schedule');
    const days = data?.days;
    if (!days || !Object.keys(days).length) return levelSchedules[level];
    const out = {};
    for (const di of Object.keys(days)) {
        out[di] = (days[di] || []).map(id => CLASS_META.get(Number(id)) || {
            classId: Number(id), type: isProgramId(Number(id)) ? 'Program' : 'Class',
            className: `Class ${id}`, trainingType: '', mediaId: '', image: '', description: '',
        });
    }
    return out;
}

// The user's editable week, materialised. Editing a week that was never customised must
// start from that level's template, otherwise the first edit would silently wipe the other
// six days.
async function readUserWeek(userId, level) {
    const { data } = await readWorkoutState(userId, 'levels_schedule');
    if (data?.days && Object.keys(data.days).length) {
        const days = {};
        for (const di of Object.keys(data.days)) days[di] = [...(data.days[di] || [])];
        return days;
    }
    const tpl = levelSchedules[String(level)] || {};
    const days = {};
    for (const di of Object.keys(tpl)) days[di] = (tpl[di] || []).map(i => Number(i.classId));
    return days;
}

async function writeUserWeek(userId, days) {
    const { data } = await readWorkoutState(userId, 'levels_schedule');
    await writeWorkoutState(userId, 'levels_schedule', { ...(data || {}), days });
}

// One day rendered in the legacy AWS item shape the frontend's processUserWorkout expects.
async function buildDayItems(userId, level, dayIndex, isoDate, classIds) {
    const logged = await loggedClassIds(userId, isoDate);
    const out = [];
    for (const rawId of classIds) {
        const id = Number(rawId);
        const meta = CLASS_META.get(id);
        if (meta && meta.type === 'Program' && isProgramId(id)) {
            const workout = await buildCourseView(userId, id, isoDate, 'levels');
            out.push({ scheduleId: schedId(level, dayIndex, id), classId: id, type: 'Program', dayIndex, workout });
        } else {
            out.push({
                scheduleId: schedId(level, dayIndex, id), classId: id, type: 'Class', dayIndex,
                workout: {
                    className: meta?.className || `Class ${id}`,
                    trainingType: meta?.trainingType || '',
                    mediaId: meta?.mediaId || '', image: meta?.image || '',
                    description: meta?.description || '',
                    isLogged: logged.has(id),
                },
            });
        }
    }
    return out;
}

// Logged classIds for a date from the user's 'levels' day-doc (best-effort across the
// frontend's stored shape and our own).
async function loggedClassIds(userId, date) {
    const doc = await readDayDoc(userId, 'levels', date);
    const set = new Set();
    if (!doc) return set;
    const items = Array.isArray(doc) ? doc : (doc.items || doc.workouts || []);
    for (const it of (items || [])) {
        const logged = it?.isLogged ?? it?.workout?.isLogged;
        if (logged) set.add(Number(it.classId ?? it.classOrProgOrExId));
    }
    return set;
}

export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams;
        const userId = p.get('userId');
        if (!userId) return corsJson({ error: 'userId required' }, 400);

        if (p.get('op') === 'lastViewed') {
            // 0 means "no level chosen yet" — the legacy contract, and the frontend still
            // guards on `lastLoginLevel > 0` before preselecting. Do NOT default to a real
            // level here: it used to fall back to 2, which silently put a brand-new member
            // on Intermediate Two, and it disagreed with /standing, which reports null for
            // the same field on the same user.
            const { data } = await readWorkoutState(userId, 'workout_level');
            const lvl = data?.lastViewedLevel ?? data?.levelId ?? 0;
            return corsJson({ lastLoginLevel: Number(lvl) || 0 });
        }

        // Beginner Plan weekly view. A beginner day holds ONE workoutId, which expands to
        // an ordered bundle of classes (beginnerPlans.json). Shape mirrors the levels view.
        if (p.get('view') === 'beginner') {
            const weekStartB = p.get('weekStart');
            if (!isValidIsoDate(weekStartB)) return corsJson({ error: 'weekStart=YYYY-MM-DD required' }, 400);
            const { data } = await readWorkoutState(userId, 'beginner_schedule');
            const days = data?.days || {};
            const dates = weekDatesFrom(weekStartB);
            const out = {};
            for (let i = 0; i < 7; i++) {
                const dayIndex = i + 1;
                const workoutId = days[String(dayIndex)];
                const classes = workoutId ? (beginnerPlans[String(workoutId)] || []) : [];
                const logged = classes.length ? await loggedClassIds(userId, dates[i]) : new Set();
                out[isoToDayKey(dates[i])] = {
                    scheduleId: workoutId ? Number(workoutId) * 1000 + dayIndex : null,
                    workoutId: workoutId ?? null,
                    dayIndex,
                    classesList: classes.length ? classes.map(c => {
                        const meta = CLASS_META.get(Number(c.classId));
                        return {
                            classId: Number(c.classId),
                            className: c.className || meta?.className || `Class ${c.classId}`,
                            trainingType: meta?.trainingType || '',
                            mediaId: meta?.mediaId || '',
                            image: meta?.image || '',
                            description: meta?.description || '',
                            ordering: c.ordering,
                            isLogged: logged.has(Number(c.classId)),
                        };
                    }) : null,
                };
            }
            return corsJson(out);
        }

        const level = String(p.get('level'));
        const weekStart = p.get('weekStart');
        if (!levelSchedules[level] || !isValidIsoDate(weekStart)) {
            return corsJson({ error: 'valid level and weekStart=YYYY-MM-DD required' }, 400);
        }
        const dates = weekDatesFrom(weekStart);
        const schedule = await scheduleForUser(userId, level);
        const out = {};
        for (let i = 0; i < 7; i++) {
            const dayIndex = i + 1;
            const dayKey = isoToDayKey(dates[i]);
            const items = schedule[dayIndex] || [];
            const logged = items.length ? await loggedClassIds(userId, dates[i]) : new Set();
            const dayOut = [];
            for (const it of items) {
                if (it.type === 'Program' && isProgramId(it.classId)) {
                    const workout = await buildCourseView(userId, it.classId, dates[i], 'levels');
                    dayOut.push({ scheduleId: schedId(level, dayIndex, it.classId), classId: it.classId, type: 'Program', dayIndex, workout });
                } else {
                    dayOut.push({
                        scheduleId: schedId(level, dayIndex, it.classId), classId: it.classId, type: 'Class', dayIndex,
                        workout: {
                            className: it.className, trainingType: it.trainingType || '',
                            mediaId: it.mediaId || '', image: it.image || '', description: it.description || '',
                            isLogged: logged.has(Number(it.classId)),
                        },
                    });
                }
            }
            out[dayKey] = dayOut;
        }
        // A week with zero items across all 7 days renders as a blank Guided-Plans screen.
        // The level templates always have items, so this only happens when the user's own
        // stored week (levels_schedule) exists but is empty — the seed-gap failure mode.
        if (!Object.values(out).some(d => d.length)) {
            logger.warn('workout.levels.empty_week', { userId, level, weekStart });
        }
        return corsJson(out);
    } catch (error) {
        logger.error('workout.levels.error', { userId: request.nextUrl.searchParams.get('userId'), method: 'GET', error });
        return corsJson({ error: error.message }, 400);
    }
}

export async function POST(request) {
    let logCtx = {};
    try {
        const json = await request.json();
        const { userId, op } = json;
        logCtx = { userId, op };
        if (!userId || !op) return corsJson({ error: 'userId and op required' }, 400);

        if (op === 'choose-level') {
            const level = Number(json.level);
            if (!Number.isFinite(level)) return corsJson({ error: 'level required' }, 400);
            const { data } = await readWorkoutState(userId, 'workout_level');
            await writeWorkoutState(userId, 'workout_level', {
                ...(data || {}), levelId: level, lastViewedLevel: level,
                planId: json.workoutOrPlanId ?? data?.planId ?? null,
            });
            return corsJson({ lastLoginLevel: level, levelId: level, userLevel: LEVEL_NAMES[level] || null });
        }

        // ---- schedule editing -------------------------------------------------------
        // All three write the user's own week (user_setting levels_schedule), which is the
        // same row the weekly GET reads. AWS had no level dimension here and neither do we.
        const level = json.level !== undefined && json.level !== null ? Number(json.level) : null;
        const dayIndex = Number(json.dayIndex);

        if (op === 'clear-day') {
            if (!Number.isFinite(dayIndex) || dayIndex < 1 || dayIndex > 7) {
                return corsJson({ error: 'dayIndex 1-7 required' }, 400);
            }
            const days = await readUserWeek(userId, level);
            days[String(dayIndex)] = [];
            await writeUserWeek(userId, days);
            return corsJson({ status: 200, dayIndex, items: [] });
        }

        if (op === 'add-workout') {
            const classId = Number(json.classId ?? json.workoutId);
            if (!Number.isFinite(dayIndex) || !classId) {
                return corsJson({ error: 'dayIndex and classId required' }, 400);
            }
            const days = await readUserWeek(userId, level);
            const key = String(dayIndex);
            days[key] = days[key] || [];
            if (!days[key].some(id => Number(id) === classId)) days[key].push(classId);
            await writeUserWeek(userId, days);
            const date = isValidIsoDate(json.date) ? json.date : null;
            // Return the whole day: the caller replaces its day array wholesale.
            return corsJson(await buildDayItems(userId, level, dayIndex, date, days[key]));
        }

        if (op === 'refresh-item') {
            // Swap one scheduled class for a different one of the same training type —
            // the "give me a different warm-up" button.
            const classId = Number(json.classId);
            const trainingType = String(json.trainingType || '');
            if (!Number.isFinite(dayIndex) || !classId) {
                return corsJson({ error: 'dayIndex and classId required' }, 400);
            }
            const candidates = [...CLASS_META.values()].filter(m =>
                Number(m.classId) !== classId &&
                String(m.trainingType || '').toLowerCase() === trainingType.toLowerCase() &&
                !isProgramId(Number(m.classId)));
            if (!candidates.length) {
                return corsJson({ error: `no alternative for trainingType '${trainingType}'` }, 404);
            }
            const pick = Number(candidates[Math.floor(Math.random() * candidates.length)].classId);

            const days = await readUserWeek(userId, level);
            const key = String(dayIndex);
            days[key] = (days[key] || []).map(id => (Number(id) === classId ? pick : Number(id)));
            await writeUserWeek(userId, days);

            const date = isValidIsoDate(json.date) ? json.date : null;
            const items = await buildDayItems(userId, level, dayIndex, date, [pick]);
            // AWS returned the single replacement workout, not the day.
            return corsJson(items[0] || {});
        }

        // ---- calendar operations ----------------------------------------------------
        // The calendar edits the same stored week as the Guided-Plans screen.
        if (op === 'move-item') {
            const classId = Number(json.classId);
            const from = Number(json.fromDayIndex);
            const to = Number(json.toDayIndex);
            if (!classId || !Number.isFinite(from) || !Number.isFinite(to)) {
                return corsJson({ error: 'classId, fromDayIndex and toDayIndex required' }, 400);
            }
            const days = await readUserWeek(userId, level);
            days[String(from)] = (days[String(from)] || []).filter(id => Number(id) !== classId);
            days[String(to)] = days[String(to)] || [];
            if (!days[String(to)].some(id => Number(id) === classId)) days[String(to)].push(classId);
            await writeUserWeek(userId, days);
            return corsJson({ status: 200, fromDayIndex: from, toDayIndex: to, classId });
        }

        if (op === 'remove-item') {
            const classId = Number(json.classId);
            if (!classId || !Number.isFinite(dayIndex)) {
                return corsJson({ error: 'classId and dayIndex required' }, 400);
            }
            const days = await readUserWeek(userId, level);
            days[String(dayIndex)] = (days[String(dayIndex)] || []).filter(id => Number(id) !== classId);
            await writeUserWeek(userId, days);
            return corsJson({ status: 200, dayIndex, classId });
        }

        if (op === 'add-class-days') {
            // One class placed on several days at once (the class-finder "add to my week").
            const classId = Number(json.classId);
            const list = (Array.isArray(json.dayIndexes) ? json.dayIndexes : String(json.dayIndexes || '').split(','))
                .map(n => Number(String(n).trim())).filter(n => n >= 1 && n <= 7);
            if (!classId || !list.length) {
                return corsJson({ error: 'classId and dayIndexes required' }, 400);
            }
            const days = await readUserWeek(userId, level);
            for (const di of list) {
                const key = String(di);
                days[key] = days[key] || [];
                if (!days[key].some(id => Number(id) === classId)) days[key].push(classId);
            }
            await writeUserWeek(userId, days);
            return corsJson({ status: 200, classId, dayIndexes: list });
        }

        // ---- Beginner Plan ----------------------------------------------------------
        if (op === 'select-beginner-workout') {
            const workoutId = Number(json.workoutId);
            if (!Number.isFinite(dayIndex) || !workoutId) {
                return corsJson({ error: 'dayIndex and workoutId required' }, 400);
            }
            if (!beginnerPlans[String(workoutId)]) {
                return corsJson({ error: `unknown beginner workoutId ${workoutId}` }, 404);
            }
            const { data } = await readWorkoutState(userId, 'beginner_schedule');
            const days = { ...(data?.days || {}) };
            days[String(dayIndex)] = workoutId;
            await writeWorkoutState(userId, 'beginner_schedule', { ...(data || {}), days });
            return corsJson({ status: 200, dayIndex, workoutId });
        }

        if (op === 'clear-beginner-day') {
            if (!Number.isFinite(dayIndex)) return corsJson({ error: 'dayIndex required' }, 400);
            const { data } = await readWorkoutState(userId, 'beginner_schedule');
            const days = { ...(data?.days || {}) };
            delete days[String(dayIndex)];
            await writeWorkoutState(userId, 'beginner_schedule', { ...(data || {}), days });
            return corsJson({ status: 200, dayIndex });
        }

        // Beginner logging shares the 'levels' day-doc, so a logged class shows as logged
        // in whichever view surfaces it.
        if (op === 'log-beginner' || op === 'unlog-beginner' || op === 'log-class' || op === 'unlog-class') {
            // log-class/unlog-class are the calendar's names for the same operation; both
            // write the 'levels' day-doc so a class logged anywhere reads as logged everywhere.
            const date = isValidIsoDate(json.date) ? json.date : null;
            if (!date) return corsJson({ error: 'date=YYYY-MM-DD required' }, 400);
            const ids = (Array.isArray(json.classIds) ? json.classIds : String(json.classIds || '').split(','))
                .map(n => Number(String(n).trim())).filter(Boolean);
            if (!ids.length) return corsJson({ error: 'classIds required' }, 400);

            const doc = (await readDayDoc(userId, 'levels', date)) || { items: [] };
            const items = Array.isArray(doc) ? doc : (doc.items || []);
            const byId = new Map(items.map(it => [Number(it.classId ?? it.id), it]));
            for (const id of ids) {
                const existing = byId.get(id) || { id, classId: id };
                existing.isLogged = op === 'log-beginner' || op === 'log-class';
                byId.set(id, existing);
            }
            await writeDayDoc(userId, 'levels', date, { ...(Array.isArray(doc) ? {} : doc), items: [...byId.values()] });
            return corsJson({ status: 200, date, classIds: ids, isLogged: op === 'log-beginner' || op === 'log-class' });
        }

        return corsJson({ error: `unknown op: ${op}` }, 400);
    } catch (error) {
        logger.error('workout.levels.error', { ...logCtx, method: 'POST', error });
        return corsJson({ error: error.message }, 400);
    }
}
