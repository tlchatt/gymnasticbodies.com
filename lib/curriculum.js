/**
 * lib/curriculum.js — shared Foundation-course curriculum logic, used by BOTH
 * /api/user/workout/byo/program (BYO program tiles) and /api/user/workout/levels
 * (Guided-Plans Program items). Serves the LEVEL→section→[selected progression] view
 * with per-user selection + logged state overlaid.
 */
import { readWorkoutState, writeWorkoutState, readDayDoc } from "@/lib/workout";
import curricula from "@/data/workout/programCurricula.json";
import demoVideos from "@/data/workout/demoVideos.json";
import programExercises from "@/data/workout/programExercises.json";

export const PROGRAM_IDS = { 59207: 'Core', 59219: 'Upper Body', 59213: 'Lower Body', 59225: 'Handstand', 59228: 'Movement', 60099: 'Rings' };
export const isProgramId = id => Object.prototype.hasOwnProperty.call(PROGRAM_IDS, id);

const IM_BY_EXERCISE = new Map(programExercises.map(r => [Number(r.exerciseId), r]));

// exerciseId -> {courseId, level, section, prog}
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

// The member's own choice for a section, or null when they have never made one. The
// null matters: buildCourseView must not invent a selection for every level (see below).
function chosenForSection(progs, settingsMap) {
    return progs.find(p => settingsMap[String(p.exerciseId)]) || null;
}

// The section's opening progression — used only where something has to be shown.
function defaultForSection(progs) {
    return progs.slice().sort((a, b) => (a.order || 0) - (b.order || 0))[0] || null;
}

const FOUNDATION_LEVEL = /^LEVEL \d+$/;

// Which levels to render for a member who has no saved progressions anywhere in this
// course — 688 seeded members plus every new signup. The two course families differ:
// Foundation (LEVEL 1-4) is progressive, a member sits on exactly one level, and their
// guided-plan level maps to it 1:1 (AWS: plan 1 -> LEVEL 1 100%, 2 -> LEVEL 2 87%,
// 3 -> LEVEL 3 91%, 4 -> LEVEL 4 91%). Handstand/Movement/Rings are named tiers worked
// in parallel — 96-99% of AWS members held selections in all three, so show all three.
function fallbackLevels(course, levelHint) {
    const keys = Object.keys(course.levels);
    if (!keys.every(k => FOUNDATION_LEVEL.test(k))) return keys;
    const hinted = `LEVEL ${Number(levelHint)}`;
    return [keys.includes(hinted) ? hinted : keys[0]];
}

function hydrateProgression(prog, settingsMap, progressForDate) {
    const setting = settingsMap[String(prog.exerciseId)];
    const { stepNo, step } = stepFor(prog, setting?.masterySetId);
    const setsAndReps = step ? `${step.sets}x${step.repsOrSecs}` : null;
    const progressEntry = (progressForDate || []).find(e => Number(e.exerciseId) === Number(prog.exerciseId));

    let workoutInfo = prog.workoutInfo || null;
    if (workoutInfo) {
        workoutInfo = { ...workoutInfo };
        if (workoutInfo.Strength && step) workoutInfo.Strength = { ...workoutInfo.Strength, setsAndReps };
        const im = IM_BY_EXERCISE.get(Number(prog.exerciseId));
        if (workoutInfo.Mobility && step && im?.imMastery) workoutInfo.Mobility = { ...workoutInfo.Mobility, setsAndReps: `${step.sets}x${im.imMastery}` };
    }
    return {
        exerciseId: prog.exerciseId, name: prog.name, image: prog.image, group: prog.group,
        exerciseNotation: prog.exerciseNotation, stepNo, masterySteps: prog.masterySteps,
        selected: true, usersWorkoutSettingsId: prog.exerciseId, setsAndReps, order: prog.order,
        isLogged: !!progressEntry && Number(progressEntry.status) > 0, notes: progressEntry?.notes ?? null, workoutInfo,
    };
}

export async function getSettingsMap(userId) {
    const { data } = await readWorkoutState(userId, 'byo_settings');
    return (data?.exercises) || {};
}

// Program-progress entries for (user, course, date): read from the byo OR levels day-doc.
async function progressForDate(userId, courseId, date, section = 'byo') {
    if (!date) return [];
    const doc = await readDayDoc(userId, section, date);
    const item = (doc?.items || []).find(it => Number(it.id) === Number(courseId));
    return item?.programProgress?.exercises || [];
}

// The selected-only nested view — the shape both getLegacyDataBYO and the levels
// weekly Program `workout` field expect: { LEVEL: { section: [selected progression] } }.
export async function buildCourseView(userId, courseId, date, section = 'byo', levelHint = null) {
    const course = curricula[courseId];
    if (!course) return {};
    const settingsMap = await getSettingsMap(userId);
    const progress = await progressForDate(userId, courseId, date, section);

    // AWS parity: a level the member has chosen nothing in comes back as {} — it is NOT
    // filled with defaults. my.'s proccesLegacyCourses flattens every level key into one
    // exercise list, so default-filling all of them put 3-4x the exercises on every
    // program card. 93-97% of members hold Foundation selections in exactly one level.
    const body = {};
    let anyChosen = false;
    for (const level of Object.keys(course.levels)) {
        body[level] = {};
        for (const sec of Object.keys(course.levels[level])) {
            const sel = chosenForSection(course.levels[level][sec], settingsMap);
            if (!sel) continue;
            anyChosen = true;
            body[level][sec] = [hydrateProgression(sel, settingsMap, progress)];
        }
    }
    if (anyChosen) return body;

    // Nothing chosen anywhere: show one course-appropriate starting level rather than an
    // empty card. Guided-plan callers pass the member's level; fall back to their stored
    // one so a level-3 member doesn't get dropped back to level 1's exercises.
    let hint = levelHint;
    if (hint == null && section === 'levels') {
        const { data } = await readWorkoutState(userId, 'workout_level');
        hint = data?.levelId ?? data?.lastViewedLevel ?? null;
    }
    for (const level of fallbackLevels(course, hint)) {
        for (const sec of Object.keys(course.levels[level] || {})) {
            const def = defaultForSection(course.levels[level][sec]);
            if (def) body[level][sec] = [hydrateProgression(def, settingsMap, progress)];
        }
    }
    return body;
}

export async function buildEditView(userId, courseId) {
    const course = curricula[courseId];
    if (!course) return {};
    const settingsMap = await getSettingsMap(userId);
    const body = {};
    for (const level of Object.keys(course.levels)) {
        body[level] = {};
        for (const section of Object.keys(course.levels[level])) {
            const progs = course.levels[level][section];
            // The edit screen lists every progression and must preselect one, so unlike
            // buildCourseView it keeps falling back to the section default.
            const sel = chosenForSection(progs, settingsMap) || defaultForSection(progs);
            body[level][section] = progs.map(prog => {
                const setting = settingsMap[String(prog.exerciseId)];
                const { stepNo } = stepFor(prog, setting?.masterySetId);
                return {
                    exerciseId: prog.exerciseId, name: prog.name, image: prog.image, group: prog.group,
                    exerciseNotation: prog.exerciseNotation, stepNo, masterySteps: prog.masterySteps,
                    selected: sel?.exerciseId === prog.exerciseId, usersWorkoutSettingsId: prog.exerciseId,
                    setsAndReps: null, order: prog.order,
                };
            });
        }
    }
    return body;
}

export function getDemo(courseId, exerciseId) {
    return demoVideos[`${courseId}:${exerciseId}`] || null;
}

// Difficulty/select/deselect ops (mutate user_setting byo_settings). Returns
// { body, message } — the single-progression response the frontend swaps in.
export async function applyCurriculumOp({ userId, courseId, op, exerciseId, type, masterySetId, date, section = 'byo' }) {
    const entry = EX_INDEX.get(`${courseId}:${Number(exerciseId)}`);
    if (!entry) return { error: 'exerciseId not in course' };
    const { data } = await readWorkoutState(userId, 'byo_settings');
    const state = data || {};
    state.exercises = state.exercises || {};
    const clearSiblings = () => {
        for (const sib of curricula[courseId].levels[entry.level][entry.section]) {
            if (sib.exerciseId !== Number(exerciseId)) delete state.exercises[String(sib.exerciseId)];
        }
    };
    const respond = async (message) => {
        const progress = await progressForDate(userId, courseId, date, section);
        const prog = hydrateProgression(entry.prog, state.exercises, progress);
        return { body: { [entry.level]: { [entry.section]: [prog] } }, message };
    };

    if (op === 'difficulty') {
        const cur = state.exercises[String(exerciseId)];
        const { stepNo } = stepFor(entry.prog, cur?.masterySetId);
        const next = Math.min(9, Math.max(1, stepNo + (type === 'down' ? -1 : 1)));
        const nextStep = entry.prog.masterySteps?.[String(next)];
        if (!nextStep) return { error: 'no such mastery step' };
        clearSiblings();
        state.exercises[String(exerciseId)] = { masterySetId: nextStep.masterySetId, date: date || null };
        await writeWorkoutState(userId, 'byo_settings', state);
        return respond(`Difficulty ${type === 'down' ? 'decreased' : 'increased'}.`);
    }
    if (op === 'select') {
        const ms = Number(masterySetId) || entry.prog.masterySteps?.['1']?.masterySetId;
        clearSiblings();
        state.exercises[String(exerciseId)] = { masterySetId: ms, date: date || null };
        await writeWorkoutState(userId, 'byo_settings', state);
        return respond('Progression updated.');
    }
    if (op === 'deselect') {
        delete state.exercises[String(exerciseId)];
        await writeWorkoutState(userId, 'byo_settings', state);
        return { body: {}, message: 'Progression removed.' };
    }
    return { error: `unknown op: ${op}` };
}
