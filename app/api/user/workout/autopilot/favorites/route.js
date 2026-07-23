/**
 * /api/user/workout/autopilot/favorites — AWS /auto-pilot/favorites* replacement.
 * Favorites live in user_setting type='autopilot_state' as
 *   { level, favorites: [{favoriteId, userId, title, description, exerciseIds:"1,2,3", dateCreated}] }
 * (exerciseIds stays a CSV string for AWS response parity.)
 *
 * GET    ?userId=                       -> favorites array (AWS /favorites/all shape)
 * POST   { userId, op:'create', date, title, description, dateCreated } -> created favorite
 * DELETE { userId, favoriteId }         -> { status: 200 }
 */
import {
    corsJson, corsOptions, isValidIsoDate,
    readWorkoutState, writeWorkoutState, readDayDoc,
} from "@/lib/workout";

export async function OPTIONS() { return corsOptions(); }

export async function GET(request) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');
        if (!userId) return corsJson({ error: 'userId required' }, 400);
        const { data } = await readWorkoutState(userId, 'autopilot_state');
        return corsJson(data?.favorites || []);
    } catch (error) {
        console.log('autopilot favorites GET error:', error);
        return corsJson({ error: error.message }, 400);
    }
}

export async function POST(request) {
    try {
        const json = await request.json();
        const { userId, date } = json;
        if (!userId || !isValidIsoDate(date)) return corsJson({ error: 'userId and date required' }, 400);

        const doc = await readDayDoc(userId, 'autopilot', date);
        if (!doc || !(doc.exercises || []).length) return corsJson({ error: 'no workout to save for date' }, 400);

        const { data } = await readWorkoutState(userId, 'autopilot_state');
        const state = data || {};
        const favorites = state.favorites || [];
        const favorite = {
            favoriteId: favorites.reduce((m, f) => Math.max(m, Number(f.favoriteId) || 0), 0) + 1,
            userId,
            title: json.title || '',
            description: json.description || '',
            exerciseIds: doc.exercises.map(s => s.autoPilotExerciseId).join(','),
            dateCreated: json.dateCreated || date,
        };
        favorites.push(favorite);
        await writeWorkoutState(userId, 'autopilot_state', { ...state, favorites });
        return corsJson(favorite);
    } catch (error) {
        console.log('autopilot favorites POST error:', error);
        return corsJson({ error: error.message }, 400);
    }
}

export async function DELETE(request) {
    try {
        const json = await request.json();
        const { userId, favoriteId } = json;
        if (!userId || favoriteId === undefined) return corsJson({ error: 'userId and favoriteId required' }, 400);
        const { data } = await readWorkoutState(userId, 'autopilot_state');
        const state = data || {};
        state.favorites = (state.favorites || []).filter(f => f.favoriteId !== Number(favoriteId));
        await writeWorkoutState(userId, 'autopilot_state', state);
        return corsJson({ status: 200 });
    } catch (error) {
        console.log('autopilot favorites DELETE error:', error);
        return corsJson({ error: error.message }, 400);
    }
}
