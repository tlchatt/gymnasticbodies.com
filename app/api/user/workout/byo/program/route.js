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
 * Selection semantics: exactly one selected progression per section. A level the member
 * has chosen nothing in is returned empty — see lib/curriculum.buildCourseView.
 *
 * All curriculum logic lives in lib/curriculum.js, shared with /api/user/workout/levels.
 * This route held a second copy of it until 2026-08-06; the copies drifted twice (the
 * `section` threading bug, then the level default-fill bug) — do not reintroduce one.
 */
import { corsJson, corsOptions } from "@/lib/workout";
import { buildCourseView, buildEditView, getDemo, applyCurriculumOp } from "@/lib/curriculum";
import curricula from "@/data/workout/programCurricula.json";
import { logger } from "@/lib/logger";

export async function OPTIONS() { return corsOptions(); }

const sectionOf = v => (v === 'levels' ? 'levels' : 'byo');

export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams;
        const courseId = p.get('courseId') || p.get('workoutType');
        const view = p.get('view');

        if (view === 'demo') {
            const payload = getDemo(courseId, p.get('exerciseId'));
            if (!payload) return corsJson({ error: 'no demo payload' }, 404);
            return corsJson({ body: payload });
        }

        const userId = p.get('userId');
        if (!userId || !curricula[courseId]) return corsJson({ error: 'userId and valid courseId required' }, 400);

        // All progressions with selected flags, no workoutInfo (AWS edit-workout parity).
        if (view === 'edit') return corsJson({ body: await buildEditView(userId, courseId) });

        // section 'levels' reads guided-plan progress; default 'byo' reads BYO-day progress.
        const body = await buildCourseView(userId, courseId, p.get('date'), sectionOf(p.get('section')));
        return corsJson({ body });
    } catch (error) {
        logger.error('workout.byo_program.error', { userId: request.nextUrl.searchParams.get('userId'), method: 'GET', error });
        return corsJson({ error: error.message }, 400);
    }
}

export async function PUT(request) {
    let logCtx = {};
    try {
        const json = await request.json();
        const { userId, op } = json;
        logCtx = { userId, op };
        const courseId = String(json.courseId ?? json.workoutType);
        if (!userId || !op || !curricula[courseId]) return corsJson({ error: 'userId, op and valid courseId required' }, 400);

        const { body, message, error } = await applyCurriculumOp({
            userId, courseId, op,
            exerciseId: json.exerciseId,
            type: json.type,
            masterySetId: json.masterySetId,
            date: json.date,
            section: sectionOf(json.section),
        });
        if (error) return corsJson({ error }, 400);
        return corsJson({ body, message });
    } catch (error) {
        logger.error('workout.byo_program.error', { ...logCtx, method: 'PUT', error });
        return corsJson({ error: error.message }, 400);
    }
}
