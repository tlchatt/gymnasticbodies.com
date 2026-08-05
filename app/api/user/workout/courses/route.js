/**
 * /api/user/workout/courses — Neon replacement for the AWS My Courses endpoints
 * (/byo/workout/my-courses/users/{id} and /myschedule/choose/my-courses/users/{id}/level/10).
 *
 * "My Courses" is the list of Foundation/Handstand/Movement/Rings programmes a member has
 * engaged with. AWS derived it from purchase records; there is no equivalent purchase
 * table in Neon, so it is derived from actual engagement instead: any program the member
 * has curriculum selections for (byo_settings) or has logged work against (byo/levels
 * day-docs). That matches what the screen is for — resuming a course you are working on.
 *
 * GET  ?userId=            -> [{ courseId, name, image, selectedExercises, lastLoggedDate }]
 * POST { userId, op:'choose-my-courses' } -> sets workout_level levelId 10 (Build Your Own),
 *      the AWS behaviour of the "use my courses" button.
 */
import {
    corsJson, corsOptions,
    readWorkoutState, writeWorkoutState, readDocsInRange,
} from "@/lib/workout";
import { isProgramId } from "@/lib/curriculum";
import programExercises from "@/data/workout/programExercises.json";
import { logger } from "@/lib/logger";

export async function OPTIONS() { return corsOptions(); }

const COURSES = {
    59207: { name: 'Foundation Core', image: 'foundationCore.jpg' },
    59219: { name: 'Foundation Upper Body', image: 'foundationUpperBody.jpg' },
    59213: { name: 'Foundation Lower Body', image: 'foundationLowerBody.jpg' },
    59225: { name: 'Handstand', image: 'handstand.jpg' },
    59228: { name: 'Movement', image: 'movement.jpg' },
    60099: { name: 'Rings', image: 'rings.jpg' },
};

// exerciseId -> courseId, so a curriculum selection can be attributed to its course.
const EX_TO_COURSE = new Map(
    programExercises.map(r => [Number(r.exerciseId), Number(r.groupId)]).filter(([, g]) => g));

export async function GET(request) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');
        if (!userId) return corsJson({ error: 'userId required' }, 400);

        const { data: settings } = await readWorkoutState(userId, 'byo_settings');
        const selectedByCourse = new Map();
        for (const exId of Object.keys(settings?.exercises || {})) {
            const courseId = EX_TO_COURSE.get(Number(exId));
            if (!courseId) continue;
            selectedByCourse.set(courseId, (selectedByCourse.get(courseId) || 0) + 1);
        }

        // Most recent logged activity per course, across both sections that hold programs.
        const today = new Date().toISOString().slice(0, 10);
        const lastLogged = new Map();
        for (const section of ['byo', 'levels']) {
            const rows = await readDocsInRange(userId, section, '2000-01-01', today);
            for (const r of rows) {
                const items = Array.isArray(r.data) ? r.data : (r.data?.items || []);
                for (const it of items) {
                    const id = Number(it.id ?? it.classId);
                    if (!isProgramId(id) || !it.isLogged) continue;
                    const prev = lastLogged.get(id);
                    if (!prev || prev < r.userScheduleDate) lastLogged.set(id, r.userScheduleDate);
                }
            }
        }

        const out = [];
        for (const [idStr, meta] of Object.entries(COURSES)) {
            const courseId = Number(idStr);
            const selected = selectedByCourse.get(courseId) || 0;
            const last = lastLogged.get(courseId) || null;
            if (!selected && !last) continue;         // never engaged with — not "my" course
            out.push({
                courseId,
                name: meta.name,
                image: meta.image,
                selectedExercises: selected,
                lastLoggedDate: last,
            });
        }
        out.sort((a, b) => String(b.lastLoggedDate || '').localeCompare(String(a.lastLoggedDate || '')));
        return corsJson(out);
    } catch (error) {
        logger.error('workout.courses.error', { userId: request.nextUrl.searchParams.get('userId'), method: 'GET', error });
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

        if (op === 'choose-my-courses') {
            // AWS put the member on level 10 ("Build Your Own") when they chose My Courses.
            const { data } = await readWorkoutState(userId, 'workout_level');
            await writeWorkoutState(userId, 'workout_level', {
                ...(data || {}), levelId: 10, lastViewedLevel: 10,
            });
            return corsJson({ status: 200, levelId: 10 });
        }

        return corsJson({ error: `unknown op: ${op}` }, 400);
    } catch (error) {
        logger.error('workout.courses.error', { ...logCtx, method: 'POST', error });
        return corsJson({ error: error.message }, 400);
    }
}
