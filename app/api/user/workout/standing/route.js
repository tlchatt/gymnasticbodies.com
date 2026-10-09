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
import { corsJson, corsOptions, readWorkoutState, writeWorkoutState, resolveWorkoutUserId } from "@/lib/workout";
import { logger } from "@/lib/logger";
import { db } from "@/Drizzle/index.ts";
import { user } from "@/Drizzle/db/schema";
import { eq } from "drizzle-orm";

export async function OPTIONS() { return corsOptions(); }

const LEVEL_NAMES = {
    0: 'Beginner', 1: 'Intermediate One', 2: 'Intermediate Two',
    3: 'Advanced One', 4: 'Advanced Two', 9: 'White Board', 10: 'Build Your Own',
};

export async function GET(request) {
    try {
        const userId = await resolveWorkoutUserId(request, request.nextUrl.searchParams.get('userId'));
        if (!userId) return corsJson({ error: 'userId required' }, 400);

        const [{ data: level }, { data: thrive }, { data: ap }, { data: lastLoc }, [member]] = await Promise.all([
            readWorkoutState(userId, 'workout_level'),
            readWorkoutState(userId, 'thrive_state'),
            readWorkoutState(userId, 'autopilot_state'),
            readWorkoutState(userId, 'current_location'),
            db.select({ migrationType: user.migrationType }).from(user).where(eq(user.id, userId)),
        ]);

        const levelId = level?.levelId !== undefined && level?.levelId !== null ? Number(level.levelId) : null;
        return corsJson({
            levelId,
            userLevel: levelId !== null ? (LEVEL_NAMES[levelId] || null) : null,
            // Any current member may open Thrive. The thrive_state record only exists for members
            // who used Thrive on AWS; the Thrive screen creates it on first open, so gating on it
            // alone walled out every member who joined (or was granted access) after the move.
            isThriveUser: member?.migrationType === 'current' || !!(thrive?.permissions || []).length,
            apLevel: ap?.level !== undefined ? Number(ap.level) : null,
            lastViewedLevel: level?.lastViewedLevel ?? null,
            // Current place in the app: { path, section }. section is the home-screen levelId
            // when path === '/'. The frontend uses it to land the user where they left off.
            currentLocation: (lastLoc && lastLoc.path) ? { path: lastLoc.path, section: lastLoc.section ?? null } : null,
        });
    } catch (error) {
        logger.error('workout.standing.error', { userId: request.nextUrl.searchParams.get('userId'), method: 'GET', error });
        return corsJson({ error: error.message }, 400);
    }
}

export async function PUT(request) {
    let logCtx = {};
    try {
        const json = await request.json();
        json.userId = await resolveWorkoutUserId(request, json.userId);
        const { userId, levelId } = json;
        logCtx = { userId };
        if (!userId || levelId === undefined) return corsJson({ error: 'userId and levelId required' }, 400);
        const { data } = await readWorkoutState(userId, 'workout_level');
        await writeWorkoutState(userId, 'workout_level', {
            ...(data || {}),
            levelId: Number(levelId),
            lastViewedLevel: json.lastViewedLevel ?? data?.lastViewedLevel ?? null,
        });
        return corsJson({ status: 200 });
    } catch (error) {
        logger.error('workout.standing.error', { ...logCtx, method: 'PUT', error });
        return corsJson({ error: error.message }, 400);
    }
}
