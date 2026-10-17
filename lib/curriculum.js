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
import { withStepVideos } from "@/lib/stepVideos";

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
//
// A section can hold more than one saved pick: the AWS->Neon seed merged AWS's separate
// Guided-Plan and Build-Your-Own settings into one byo_settings record, so ~3.4k members
// carry an old BYO pick next to their real guided progression in the same slot. The most
// recently saved pick is the member's current one. Taking the first in curriculum order
// (the old rule) showed the easiest, often years-stale pick, and acting on it then wiped
// the real one. Ties on date keep curriculum order, as before.
//
// Recency is pickRecency(), not the raw `date`: before 2026-09-30 the stored date was
// whatever card the member edited from — often a future day of the week — so an old
// pick made "for Saturday" outranked a newer one made today.
function chosenForSection(progs, settingsMap) {
    let best = null, bestKey = null;
    for (const p of progs) {
        const setting = settingsMap[String(p.exerciseId)];
        if (!setting) continue;
        const k = pickRecency(setting);
        if (best === null || k > bestKey) { best = p; bestKey = k; }
    }
    return best;
}

// Sort key for "which pick did the member make most recently". Picks saved since
// 2026-09-30 carry pickedAt (server time the choice was made) and always outrank older
// picks, whose only signal is `date` (the seed's AWS date, or the card date my. sent).
export function pickRecency(setting) {
    if (!setting) return '';
    return setting.pickedAt ? `1|${setting.pickedAt}` : `0|${setting.date || ''}`;
}

// A pick record stamped with when the member made it. `date` keeps its meaning (the day
// the pick was made, YYYY-MM-DD) — it is the server's today now, never the card's date.
function newPick(masterySetId) {
    const pickedAt = new Date().toISOString();
    return { masterySetId, date: pickedAt.slice(0, 10), pickedAt };
}

// Make exerciseId the section's current pick: retire its siblings, drop any stale
// archived copy of itself (it is live again), and store the new pick.
function setCurrentPick(state, courseId, entry, exerciseId, masterySetId) {
    archiveSiblings(state, courseId, entry, exerciseId);
    if (state.archived) delete state.archived[String(exerciseId)];
    if (state.removed) delete state.removed[removedKey(courseId, entry.section)];
    state.exercises[String(exerciseId)] = newPick(masterySetId);
}

// Retire the other picks in a section when one becomes the member's current choice. They
// are moved to state.archived rather than deleted, so a pick retired by mistake (e.g. a
// member acting on a stale screen) can still be recovered.
function archiveSiblings(state, courseId, entry, exerciseId) {
    for (const sib of slotProgressions(courseId, entry)) {
        const key = String(sib.exerciseId);
        if (sib.exerciseId === Number(exerciseId) || !state.exercises[key]) continue;
        state.archived = state.archived || {};
        state.archived[key] = { ...state.exercises[key], archivedAt: new Date().toISOString() };
        delete state.exercises[key];
    }
}

// Foundation courses (Core / Upper Body / Lower Body) repeat the same sections in every
// level (Front Lever, Manna, Single Leg Squat…) and members progress each one on its own,
// so one section is ONE slot across all levels: picking in LEVEL 2's Manna replaces the
// LEVEL 1 Manna pick. Named-tier courses (Handstand/Movement/Rings) have unique sections.
const FOUNDATION_COURSE = id => Object.keys(curricula[id]?.levels || {}).every(l => /^LEVEL \d+$/.test(l));

function slotProgressions(courseId, entry) {
    const { levels } = curricula[courseId];
    if (!FOUNDATION_COURSE(courseId)) return levels[entry.level][entry.section];
    return Object.keys(levels).flatMap(l => levels[l][entry.section] || []);
}

// The member's current pick for a Foundation section slot, as { level, prog } or null.
// A pick made in this app (pickedAt, since 2026-09-30) is an explicit choice, so the
// newest one wins whatever level it is in. Otherwise only migrated picks exist, whose
// dates are unreliable: prefer the pick in `keepLevel` (the level the member is on),
// else the most recent migrated pick in any level.
function currentForSlot(courseId, section, settingsMap, keepLevel) {
    const { levels } = curricula[courseId];
    const cands = [];
    for (const level of Object.keys(levels)) {
        const progs = levels[level][section];
        const prog = progs && chosenForSection(progs, settingsMap);
        if (prog) cands.push({ level, prog, setting: settingsMap[String(prog.exerciseId)] });
    }
    if (!cands.length) return null;
    const newest = list => list.reduce((a, b) => {
        const ka = pickRecency(a.setting), kb = pickRecency(b.setting);
        if (kb > ka) return b;
        if (kb === ka && b.level === keepLevel) return b;
        return a;
    });
    const explicit = cands.filter(c => c.setting.pickedAt);
    if (explicit.length) return newest(explicit);
    return cands.find(c => c.level === keepLevel) || newest(cands);
}

// Sections the member took off their card with Remove: { "<courseId>:<section>": iso }.
// Without this a removed section would come straight back as its default (see
// buildCourseView), so Remove would look like it did nothing. Picking anything in the
// section again clears it (setCurrentPick).
function removedKey(courseId, section) {
    return `${Number(courseId)}:${section}`;
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

    let workoutInfo = withStepVideos(prog.workoutInfo || null, prog, stepNo);
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

async function readPicks(userId) {
    const { data } = await readWorkoutState(userId, 'byo_settings');
    return { settingsMap: data?.exercises || {}, removed: data?.removed || {} };
}

// Program-progress entries for (user, course, date): read from the byo OR levels day-doc.
async function progressForDate(userId, courseId, date, section = 'byo') {
    if (!date) return [];
    const doc = await readDayDoc(userId, section, date);
    const item = (doc?.items || []).find(it => Number(it.id) === Number(courseId));
    return item?.programProgress?.exercises || [];
}

// Only 1-4 name a real plan. levelId also carries AWS's activity sentinels (0/9/10/11/99),
// so fall through to lastViewedLevel rather than treating "10" as a level.
async function resolveLevelHint(userId, levelHint) {
    const real = v => (v >= 1 && v <= 4 ? Number(v) : null);
    if (real(levelHint) !== null) return real(levelHint);
    const { data } = await readWorkoutState(userId, 'workout_level');
    return real(data?.levelId) ?? real(data?.lastViewedLevel) ?? null;
}

// Which of these levels is the member actually on? Their most recently chosen
// progression says so directly — selections carry the date they were made, and moving
// up a level leaves the old level's choices behind rather than clearing them.
function latestChosenLevel(course, levels, settingsMap) {
    let best = null, bestDate = '';
    for (const level of levels) {
        for (const sec of Object.keys(course.levels[level])) {
            for (const prog of course.levels[level][sec]) {
                const setting = settingsMap[String(prog.exerciseId)];
                const d = setting && (setting.pickedAt || setting.date) ? pickRecency(setting) : '';
                if (d && d > bestDate) { bestDate = d; best = level; }
            }
        }
    }
    return best;
}

// The Foundation level a member is on, among the levels they hold picks in: their plan
// level when they have picks there, else the level of their most recent pick.
async function memberLevel(userId, course, filled, settingsMap, levelHint) {
    const hinted = `LEVEL ${await resolveLevelHint(userId, levelHint)}`;
    return filled.includes(hinted) ? hinted : (latestChosenLevel(course, filled, settingsMap) || filled[0]);
}

// The selected-only nested view — the shape both getLegacyDataBYO and the levels
// weekly Program `workout` field expect: { LEVEL: { section: [selected progression] } }.
export async function buildCourseView(userId, courseId, date, section = 'byo', levelHint = null) {
    const course = curricula[courseId];
    if (!course) return {};
    const { settingsMap, removed } = await readPicks(userId);
    const isRemoved = sec => !!removed[removedKey(courseId, sec)];
    const progress = await progressForDate(userId, courseId, date, section);

    // AWS parity: a level the member has chosen nothing in comes back as {} — it is NOT
    // filled with defaults. my.'s proccesLegacyCourses flattens every level key into one
    // exercise list, so default-filling all of them put 3-4x the exercises on every
    // program card. 93-97% of members hold Foundation selections in exactly one level.
    const body = {};
    for (const level of Object.keys(course.levels)) {
        body[level] = {};
        for (const sec of Object.keys(course.levels[level])) {
            const sel = chosenForSection(course.levels[level][sec], settingsMap);
            if (sel) body[level][sec] = [hydrateProgression(sel, settingsMap, progress)];
        }
    }

    const filled = Object.keys(body).filter(l => Object.keys(body[l]).length);
    if (filled.length) {
        // A member who moved up a level keeps the older level's choices on file, and the
        // migration merged AWS's separate guided/BYO settings into one record, so picks can
        // sit in several levels and my. flattens every level into one list. Named-tier
        // courses (Handstand/Movement/Rings) are trained across all tiers at once — 96-99%
        // of AWS members held selections in every one — so they keep every tier.
        if (FOUNDATION_COURSE(courseId)) {
            // One pick per section slot across all levels (see currentForSlot). The level
            // the member is on decides migrated-pick ties and where unpicked sections are
            // filled. Still one exercise per section, so the card never multiplies (Aug
            // 09ecb9e/3335327) — but a section the member progressed in another level no
            // longer disappears behind the other level's picks.
            const keep = await memberLevel(userId, course, filled, settingsMap, levelHint);
            for (const l of Object.keys(body)) body[l] = {};
            for (const sec of Object.keys(course.levels[keep])) {
                const cur = currentForSlot(courseId, sec, settingsMap, keep);
                if (cur) body[cur.level][sec] = [hydrateProgression(cur.prog, settingsMap, progress)];
                else if (!isRemoved(sec)) {
                    const def = defaultForSection(course.levels[keep][sec]);
                    if (def) body[keep][sec] = [hydrateProgression(def, settingsMap, progress)];
                }
            }
            for (const l of Object.keys(body)) {
                body[l] = Object.fromEntries(Object.keys(course.levels[l]).filter(sec => body[l][sec]).map(sec => [sec, body[l][sec]]));
            }
            return body;
        }
        // A level the member trains keeps every section. Only the sections they have picked
        // used to come back, so after a member's first edit the rest (and warm-ups such as
        // Wrist stretches / Quadrupedal Warm Up) silently dropped off the card. Fill those
        // with the section default, except sections the member removed on purpose.
        for (const level of Object.keys(body)) {
            if (!Object.keys(body[level]).length) continue;
            for (const sec of Object.keys(course.levels[level])) {
                if (body[level][sec] || isRemoved(sec)) continue;
                const def = defaultForSection(course.levels[level][sec]);
                if (def) body[level][sec] = [hydrateProgression(def, settingsMap, progress)];
            }
            // Keep curriculum order so a filled-in warm-up still comes first.
            body[level] = Object.fromEntries(Object.keys(course.levels[level])
                .filter(sec => body[level][sec]).map(sec => [sec, body[level][sec]]));
        }
        return body;
    }

    // Nothing chosen anywhere: show one course-appropriate starting level rather than an
    // empty card. Guided-plan callers pass the member's level; fall back to their stored
    // one so a level-3 member doesn't get dropped back to level 1's exercises.
    for (const level of fallbackLevels(course, await resolveLevelHint(userId, levelHint))) {
        for (const sec of Object.keys(course.levels[level] || {})) {
            if (isRemoved(sec)) continue;
            const def = defaultForSection(course.levels[level][sec]);
            if (def) body[level][sec] = [hydrateProgression(def, settingsMap, progress)];
        }
    }
    return body;
}

export async function buildEditView(userId, courseId, levelHint = null) {
    const course = curricula[courseId];
    if (!course) return {};
    const { settingsMap, removed } = await readPicks(userId);
    let keep = null;
    if (FOUNDATION_COURSE(courseId)) {
        const levels = Object.keys(course.levels);
        const filled = levels.filter(l => Object.values(course.levels[l]).some(progs => chosenForSection(progs, settingsMap)));
        keep = await memberLevel(userId, course, filled.length ? filled : levels, settingsMap, levelHint);
    }
    const body = {};
    for (const level of Object.keys(course.levels)) {
        body[level] = {};
        for (const section of Object.keys(course.levels[level])) {
            const progs = course.levels[level][section];
            // The edit screen lists every progression and must preselect one, so unlike
            // buildCourseView it keeps falling back to the section default — unless the
            // member removed the section, which then shows nothing selected (so Add is offered).
            const isRemoved = !!removed[removedKey(courseId, section)];
            let sel;
            if (keep) {
                // Foundation: only the slot's current pick (the one on the card) is selected,
                // in its own level; a slot with no pick anywhere preselects its default.
                const cur = currentForSlot(courseId, section, settingsMap, keep);
                sel = cur ? (cur.level === level ? cur.prog : null) : (isRemoved ? null : defaultForSection(progs));
            } else {
                sel = chosenForSection(progs, settingsMap) || (isRemoved ? null : defaultForSection(progs));
            }
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
        setCurrentPick(state, courseId, entry, exerciseId, nextStep.masterySetId);
        await writeWorkoutState(userId, 'byo_settings', state);
        return respond(`Difficulty ${type === 'down' ? 'decreased' : 'increased'}.`);
    }
    if (op === 'select') {
        const ms = Number(masterySetId) || entry.prog.masterySteps?.['1']?.masterySetId;
        setCurrentPick(state, courseId, entry, exerciseId, ms);
        await writeWorkoutState(userId, 'byo_settings', state);
        return respond('Progression updated.');
    }
    if (op === 'deselect') {
        // Retire every pick in the section, not just this one. Many members hold two picks
        // in one section (the AWS guided + BYO merge, see chosenForSection), and deleting
        // only the shown one made the older pick reappear as if Remove had failed. Retired
        // picks are archived, not deleted, so they can be recovered.
        archiveSiblings(state, courseId, entry, exerciseId);
        const own = state.exercises[String(exerciseId)];
        if (own) state.archived = { ...(state.archived || {}), [String(exerciseId)]: { ...own, archivedAt: new Date().toISOString() } };
        delete state.exercises[String(exerciseId)];
        state.removed = { ...(state.removed || {}), [removedKey(courseId, entry.section)]: new Date().toISOString() };
        await writeWorkoutState(userId, 'byo_settings', state);
        return { body: {}, message: 'Progression removed.' };
    }
    return { error: `unknown op: ${op}` };
}

// Mastery auto-progression on a logged set — the AWS "autoprogress" behaviour.
// On the legacy app, logging a program set with autoprogress on advanced the member to
// the next mastery step (the frontend's "Stay on same step" checkbox, default OFF, is the
// inverse of this flag). The Neon program-log handler recorded the set but never advanced
// the step, so guided-plan workouts stopped getting harder after the AWS->Neon cutover
// (byo_settings — the per-exercise current step — is only ever moved by the manual
// difficulty/select buttons). This restores the auto-advance: it is exactly one manual
// "increase difficulty" tap, applied server-side to the exercise that was just logged.
//
// Safe by construction for the ~5k guided/sentinel members:
//   - only advances the ONE exercise that was logged, one step, within its own progression;
//   - never advances past the exercise's top mastery step (no error, no wrap, just stops);
//   - idempotent: if the stored step is already at/after the next step (e.g. a retried log),
//     it is a no-op, so a duplicate POST can't double-advance;
//   - only fires when a real logged masterySetId is present and maps to a known step;
//   - retires (archives) sibling selections exactly as the manual difficulty/select ops do, preserving
//     the "one selected progression per section" invariant.
// Returns { advanced, from?, to? } and never throws for an out-of-range/unknown input.
export async function advanceMasteryStepOnLog({ userId, courseId, exerciseId, loggedMasterySetId, date, section = 'byo' }) {
    const entry = EX_INDEX.get(`${courseId}:${Number(exerciseId)}`);
    if (!entry) return { advanced: false, reason: 'exerciseId not in course' };
    // Need a real, known logged step to advance from — otherwise we'd be guessing.
    if (loggedMasterySetId == null) return { advanced: false, reason: 'no logged masterySetId' };
    const steps = entry.prog.masterySteps || {};
    const known = Object.values(steps).some(s => Number(s.masterySetId) === Number(loggedMasterySetId));
    if (!known) return { advanced: false, reason: 'logged masterySetId not a step of this exercise' };

    const { stepNo: loggedStepNo } = stepFor(entry.prog, loggedMasterySetId);
    const target = loggedStepNo + 1;
    const nextStep = steps[String(target)];
    if (!nextStep) return { advanced: false, reason: 'already at top mastery step' };

    const { data } = await readWorkoutState(userId, 'byo_settings');
    const state = data || {};
    state.exercises = state.exercises || {};
    const cur = state.exercises[String(exerciseId)];
    const { stepNo: curStepNo } = stepFor(entry.prog, cur?.masterySetId);
    // Idempotency: if the stored step is already past the step just logged, a prior advance
    // (or a retry) already handled this — do nothing.
    if (cur && curStepNo > loggedStepNo) return { advanced: false, reason: 'already advanced' };
    // Only the member's current pick for the section advances. Logging a different one means
    // the screen was stale (an old cached view, or the pre-fix display that showed the
    // easiest pick); advancing it would make it current and retire the real progression.
    // The logged set is still recorded by the caller — only the step change is skipped.
    const current = FOUNDATION_COURSE(courseId)
        ? currentForSlot(courseId, entry.section, state.exercises, entry.level)?.prog
        : chosenForSection(curricula[courseId].levels[entry.level][entry.section], state.exercises);
    if (current && current.exerciseId !== Number(exerciseId)) return { advanced: false, reason: 'not the current pick for this section' };

    setCurrentPick(state, courseId, entry, exerciseId, nextStep.masterySetId);
    await writeWorkoutState(userId, 'byo_settings', state);
    return { advanced: true, from: loggedStepNo, to: target };
}
