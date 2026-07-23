/**
 * /api/user/workout/byo/program — Neon replacement for the legacy program-detail
 * (curriculum) endpoints. Serves the six strength programs from the static
 * data/workout/programCurricula.json + demoVideos.json catalogs (captured from live
 * AWS 2026-07-22), overlaid with per-user state:
 *   user_setting type='byo_settings' : { exercises: { "<exerciseId>": {masterySetId, date} } }
 *   user_logs section='byo'          : day docs (programProgress -> isLogged/notes per date)
 *
 * AWS-parity contracts (responses wrapped in { body, message? } exactly like the legacy API):
 *   GET ?userId=&courseId=&date=                    -> getLegacyDataBYO   { body: {LEVEL:{section:[selected prog]}} }
 *   GET ?userId=&courseId=&view=edit                -> edit-workout       { body: {LEVEL:{section:[all progs, selected flags, no workoutInfo]}} }
 *   GET ?courseId=&exerciseId=&view=demo            -> demo videos        { body: {Strength?, Mobility?} }
 *   PUT { userId, courseId, op:'difficulty', exerciseId, type:'up'|'down', date }
 *   PUT { userId, courseId, op:'select', exerciseId, masterySetId, date }   (swaps within section)
 *   PUT { userId, courseId, op:'deselect', exerciseId }
 * Selection semantics: exactly one selected progression per section; defaults to the
 * first progression of the section's first level at step 1 when the user has no choice.
 */
import {
    corsJson, corsOptions, isValidIsoDate,
    readWorkoutState, writeWorkoutState, readDayDoc,
} from "@/lib/workout";
import curricula from "@/data/workout/programCurricula.json";
import demoVideos from "@/data/workout/demoVideos.json";
import programExercises from "@/data/workout/programExercises.json";

export async function OPTIONS() { return corsOptions(); }

const IM_BY_EXERCISE = new Map(programExercises.map(r => [Number(r.exerciseId), r]));

// exerciseId -> { courseId, level, section, prog } (exercise ids are unique per course;
// key by courseId:exerciseId to be safe)
const EX_INDEX = new Map();
for (const courseId of Object.keys(curricula)) {
    const { levels } = curricula[courseId];
    for (const level of Object.keys(levels)) {
        for (const section of Object.keys(levels[level])) {
            for (const prog of levels[level][section]) {
                EX_INDEX.set(`${courseId}:${prog.exerciseId}`, { courseId: Number(courseId), level, section, prog });
            }
        }
    }
}

function stepFor(prog, masterySetId) {
    const steps = prog.masterySteps || {};
    for (const k of Object.keys(steps)) {
        if (Number(steps[k].masterySetId) === Number(masterySetId)) return { stepNo: Number(k), step: steps[k] };
    }
    return { stepNo: 1, step: steps['1'] || Object.values(steps)[0] || null };
}

// Section selection for a user: settings-chosen exercise, else the section default.
function selectedForSection(progs, settingsMap) {
    const chosen = progs.find(p => settingsMap[String(p.exerciseId)]);
    if (chosen) return chosen;
    return progs.slice().sort((a, b) => (a.order || 0) - (b.order || 0))[0];
}

function hydrateProgression(prog, level, section, settingsMap, progressForDate) {
    const setting = settingsMap[String(prog.exerciseId)];
    const { stepNo, step } = stepFor(prog, setting?.masterySetId);
    const setsAndReps = step ? `${step.sets}x${step.repsOrSecs}` : null;
    const progressEntry = (progressForDate || []).find(e => Number(e.exerciseId) === Number(prog.exerciseId));

    // Recompute per-step setsAndReps inside workoutInfo (Strength follows the step;
    // Mobility follows sets x imMastery; WarmUp untouched).
    let workoutInfo = prog.workoutInfo || null;
    if (workoutInfo) {
        workoutInfo = { ...workoutInfo };
        if (workoutInfo.Strength && step) workoutInfo.Strength = { ...workoutInfo.Strength, setsAndReps };
        const im = IM_BY_EXERCISE.get(Number(prog.exerciseId));
        if (workoutInfo.Mobility && step && im?.imMastery) {
            workoutInfo.Mobility = { ...workoutInfo.Mobility, setsAndReps: `${step.sets}x${im.imMastery}` };
        }
    }

    return {
        exerciseId: prog.exerciseId,
        name: prog.name,
        image: prog.image,
        group: prog.group,
        exerciseNotation: prog.exerciseNotation,
        stepNo,
        masterySteps: prog.masterySteps,
        selected: true,
        usersWorkoutSettingsId: prog.exerciseId,   // stable synthetic id
        setsAndReps,
        order: prog.order,
        isLogged: !!progressEntry && Number(progressEntry.status) > 0,
        notes: progressEntry?.notes ?? null,
        workoutInfo,
    };
}

async function progressForDate(userId, courseId, date, section = 'byo') {
    if (!isValidIsoDate(date)) return [];
    const doc = await readDayDoc(userId, section, date);
    const item = (doc?.items || []).find(it => Number(it.id) === Number(courseId));
    return item?.programProgress?.exercises || [];
}

async function getSettingsMap(userId) {
    const { data } = await readWorkoutState(userId, 'byo_settings');
    return (data?.exercises) || {};
}

// The selected-only nested view (getLegacyDataBYO parity)
async function buildCourseView(userId, courseId, date, section = 'byo') {
    const course = curricula[courseId];
    if (!course) return null;
    const settingsMap = await getSettingsMap(userId);
    const progress = await progressForDate(userId, courseId, date, section);
    const body = {};
    for (const level of Object.keys(course.levels)) {
        body[level] = {};
        for (const section of Object.keys(course.levels[level])) {
            const sel = selectedForSection(course.levels[level][section], settingsMap);
            if (sel) body[level][section] = [hydrateProgression(sel, level, section, settingsMap, progress)];
        }
    }
    return body;
}

export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams;
        const courseId = p.get('courseId') || p.get('workoutType');
        const view = p.get('view');

        if (view === 'demo') {
            const exerciseId = p.get('exerciseId');
            const payload = demoVideos[`${courseId}:${exerciseId}`];
            if (!payload) return corsJson({ error: 'no demo payload' }, 404);
            return corsJson({ body: payload });
        }

        const userId = p.get('userId');
        if (!userId || !curricula[courseId]) return corsJson({ error: 'userId and valid courseId required' }, 400);

        if (view === 'edit') {
            // All progressions, selected flags, no workoutInfo (AWS edit-workout parity).
            const settingsMap = await getSettingsMap(userId);
            const course = curricula[courseId];
            const body = {};
            for (const level of Object.keys(course.levels)) {
                body[level] = {};
                for (const section of Object.keys(course.levels[level])) {
                    const progs = course.levels[level][section];
                    const sel = selectedForSection(progs, settingsMap);
                    body[level][section] = progs.map(prog => {
                        const setting = settingsMap[String(prog.exerciseId)];
                        const { stepNo } = stepFor(prog, setting?.masterySetId);
                        return {
                            exerciseId: prog.exerciseId,
                            name: prog.name,
                            image: prog.image,
                            group: prog.group,
                            exerciseNotation: prog.exerciseNotation,
                            stepNo,
                            masterySteps: prog.masterySteps,
                            selected: sel?.exerciseId === prog.exerciseId,
                            usersWorkoutSettingsId: prog.exerciseId,
                            setsAndReps: null,
                            order: prog.order,
                        };
                    });
                }
            }
            return corsJson({ body });
        }

        // section 'levels' reads guided-plan progress; default 'byo' reads BYO-day progress.
        const body = await buildCourseView(userId, courseId, p.get('date'), p.get('section') === 'levels' ? 'levels' : 'byo');
        return corsJson({ body });
    } catch (error) {
        console.log('byo program GET error:', error);
        return corsJson({ error: error.message }, 400);
    }
}

export async function PUT(request) {
    try {
        const json = await request.json();
        const { userId, op } = json;
        const courseId = String(json.courseId ?? json.workoutType);
        if (!userId || !op || !curricula[courseId]) return corsJson({ error: 'userId, op and valid courseId required' }, 400);
        const exerciseId = Number(json.exerciseId);
        const key = `${courseId}:${exerciseId}`;
        const entry = EX_INDEX.get(key);
        if (!entry) return corsJson({ error: 'exerciseId not in course' }, 400);

        const { data } = await readWorkoutState(userId, 'byo_settings');
        const state = data || {};
        state.exercises = state.exercises || {};

        const clearSectionSiblings = () => {
            // one selected per section: drop settings for other exercises in this section
            for (const sib of curricula[courseId].levels[entry.level][entry.section]) {
                if (sib.exerciseId !== exerciseId) delete state.exercises[String(sib.exerciseId)];
            }
        };
        const respondWithProg = async (message) => {
            const settingsMap = state.exercises;
            const progress = await progressForDate(userId, courseId, json.date);
            const prog = hydrateProgression(entry.prog, entry.level, entry.section, settingsMap, progress);
            return corsJson({ body: { [entry.level]: { [entry.section]: [prog] } }, message });
        };

        switch (op) {
            case 'difficulty': {
                const current = state.exercises[String(exerciseId)];
                const { stepNo } = stepFor(entry.prog, current?.masterySetId);
                const dir = json.type === 'down' ? -1 : 1;
                const next = Math.min(9, Math.max(1, stepNo + dir));
                const nextStep = entry.prog.masterySteps?.[String(next)];
                if (!nextStep) return corsJson({ error: 'no such mastery step' }, 400);
                clearSectionSiblings();
                state.exercises[String(exerciseId)] = { masterySetId: nextStep.masterySetId, date: json.date || null };
                await writeWorkoutState(userId, 'byo_settings', state);
                return respondWithProg(`Difficulty ${json.type === 'down' ? 'decreased' : 'increased'}.`);
            }
            case 'select': {
                const masterySetId = Number(json.masterySetId) || entry.prog.masterySteps?.['1']?.masterySetId;
                clearSectionSiblings();
                state.exercises[String(exerciseId)] = { masterySetId, date: json.date || null };
                await writeWorkoutState(userId, 'byo_settings', state);
                return respondWithProg('Progression updated.');
            }
            case 'deselect': {
                delete state.exercises[String(exerciseId)];
                await writeWorkoutState(userId, 'byo_settings', state);
                return corsJson({ body: {}, message: 'Progression removed.' });
            }
            default:
                return corsJson({ error: `unknown op: ${op}` }, 400);
        }
    } catch (error) {
        console.log('byo program PUT error:', error);
        return corsJson({ error: error.message }, 400);
    }
}
