/**
 * /api/user/workout/levels — Neon replacement for AWS Guided-Plans
 * (/myschedule/levels/*). Schedule from the static level_plans catalog
 * (data/workout/levelSchedules.json); Program items hydrated via the shared curriculum
 * (lib/curriculum.buildCourseView); per-user logged state from user_logs section 'levels'.
 *
 * GET ?userId=&level=&weekStart=YYYY-MM-DD   -> AWS-parity day-keyed weekly view:
 *     { "MONDAY,JULY 20": [ {scheduleId, classId, type, dayIndex, workout:{...}} ], ... }
 * GET ?op=lastViewed&userId=                 -> { lastLoginLevel }
 * POST { userId, op:'choose-level', level }  -> persists chosen level; { lastLoginLevel }
 */
import {
    corsJson, corsOptions, isValidIsoDate, weekDatesFrom, isoToDayKey,
    readWorkoutState, writeWorkoutState, readDayDoc,
} from "@/lib/workout";
import { buildCourseView, isProgramId } from "@/lib/curriculum";
import levelSchedules from "@/data/workout/levelSchedules.json";

export async function OPTIONS() { return corsOptions(); }

// Deterministic, stable schedule id per (level, dayIndex, classId) — the frontend uses
// it to match logged state and to target delete/switch ops.
const schedId = (level, dayIndex, classId) => Number(level) * 10000000 + dayIndex * 100000 + Number(classId);

const LEVEL_NAMES = { 0: 'Beginner', 1: 'Intermediate One', 2: 'Intermediate Two', 3: 'Advanced One', 4: 'Advanced Two' };

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
            const { data } = await readWorkoutState(userId, 'workout_level');
            const lvl = data?.lastViewedLevel ?? data?.levelId ?? 2;
            return corsJson({ lastLoginLevel: Number(lvl) });
        }

        const level = String(p.get('level'));
        const weekStart = p.get('weekStart');
        if (!levelSchedules[level] || !isValidIsoDate(weekStart)) {
            return corsJson({ error: 'valid level and weekStart=YYYY-MM-DD required' }, 400);
        }
        const dates = weekDatesFrom(weekStart);
        const schedule = levelSchedules[level];
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
        return corsJson(out);
    } catch (error) {
        console.log('levels GET error:', error);
        return corsJson({ error: error.message }, 400);
    }
}

export async function POST(request) {
    try {
        const json = await request.json();
        const { userId, op } = json;
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

        return corsJson({ error: `unknown op: ${op}` }, 400);
    } catch (error) {
        console.log('levels POST error:', error);
        return corsJson({ error: error.message }, 400);
    }
}
