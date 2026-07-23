/**
 * /api/user/workout/standing — real per-user workout standing for the frontend,
 * replacing the hardcoded LoginNew/authCheckState defaults ('Advanced One'/levelId 3,
 * isThriveUser always true).
 *
 * GET ?userId= -> { levelId, userLevel, isThriveUser, apLevel, lastViewedLevel }
 *   levelId/userLevel from user_setting type='workout_level' (seeded from AWS
 *   user_workout_levels + service-activity derivation); null levelId means "no seeded
 *   level" — the frontend falls back to its localStorage/default chain.
 * PUT { userId, levelId } -> persists a user-chosen level so defaults stick.
 */
import { corsJson, corsOptions, readWorkoutState, writeWorkoutState } from "@/lib/workout";

export async function OPTIONS() { return corsOptions(); }

const LEVEL_NAMES = {
    0: 'Beginner', 1: 'Intermediate One', 2: 'Intermediate Two',
    3: 'Advanced One', 4: 'Advanced Two', 9: 'White Board', 10: 'Build Your Own',
};

export async function GET(request) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');
        if (!userId) return corsJson({ error: 'userId required' }, 400);

        const [{ data: level }, { data: thrive }, { data: ap }] = await Promise.all([
            readWorkoutState(userId, 'workout_level'),
            readWorkoutState(userId, 'thrive_state'),
            readWorkoutState(userId, 'autopilot_state'),
        ]);

        const levelId = level?.levelId !== undefined && level?.levelId !== null ? Number(level.levelId) : null;
        return corsJson({
            levelId,
            userLevel: levelId !== null ? (LEVEL_NAMES[levelId] || null) : null,
            isThriveUser: !!(thrive?.permissions || []).length,
            apLevel: ap?.level !== undefined ? Number(ap.level) : null,
            lastViewedLevel: level?.lastViewedLevel ?? null,
        });
    } catch (error) {
        console.log('standing GET error:', error);
        return corsJson({ error: error.message }, 400);
    }
}

export async function PUT(request) {
    try {
        const json = await request.json();
        const { userId, levelId } = json;
        if (!userId || levelId === undefined) return corsJson({ error: 'userId and levelId required' }, 400);
        const { data } = await readWorkoutState(userId, 'workout_level');
        await writeWorkoutState(userId, 'workout_level', {
            ...(data || {}),
            levelId: Number(levelId),
            lastViewedLevel: json.lastViewedLevel ?? data?.lastViewedLevel ?? null,
        });
        return corsJson({ status: 200 });
    } catch (error) {
        console.log('standing PUT error:', error);
        return corsJson({ error: error.message }, 400);
    }
}
