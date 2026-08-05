/**
 * /api/user/workout/byo/favorites — AWS /byo/favorites* replacement.
 * Favorites live in user_setting type='byo_favorites' as
 *   { favorites: [{favoriteId, userId, title, description, workoutIdList:"59178-1,59210-2", dateCreated}] }
 * (workoutIdList stays the legacy "id-orderingType" CSV for response parity.)
 *
 * GET    ?userId=                                   -> favorites array
 * POST   { userId, op:'create', title, description, workoutIdList, dateCreated, date? } -> created favorite
 * POST   { userId, op:'apply', favoriteId, date, dayIndex? } -> { workoutsInADayList, favoriteId }
 * DELETE { userId, favoriteId }                     -> { status: 200 }
 */
import {
    corsJson, corsOptions, isValidIsoDate,
    readWorkoutState, writeWorkoutState,
    readDayDoc, writeDayDoc,
} from "@/lib/workout";
import { hydrateDay } from "../hydrate.js";
import { logger } from "@/lib/logger";

export async function OPTIONS() { return corsOptions(); }

export async function GET(request) {
    try {
        const userId = request.nextUrl.searchParams.get('userId');
        if (!userId) return corsJson({ error: 'userId required' }, 400);
        const { data } = await readWorkoutState(userId, 'byo_favorites');
        return corsJson(data?.favorites || []);
    } catch (error) {
        logger.error('workout.byo_favorites.error', { userId: request.nextUrl.searchParams.get('userId'), method: 'GET', error });
        return corsJson({ error: error.message }, 400);
    }
}

function parseWorkoutIdList(workoutIdList) {
    return String(workoutIdList || '').split(',').map(pair => {
        const [id, orderingType] = pair.split('-').map(s => Number(s.trim()));
        return id && orderingType !== undefined ? { id, orderingType } : null;
    }).filter(Boolean);
}

export async function POST(request) {
    let logCtx = {};
    try {
        const json = await request.json();
        const { userId, op } = json;
        logCtx = { userId, op };
        if (!userId) return corsJson({ error: 'userId required' }, 400);
        const { data } = await readWorkoutState(userId, 'byo_favorites');
        const state = data || {};
        const favorites = state.favorites || [];

        if (op === 'apply') {
            const fav = favorites.find(f => f.favoriteId === Number(json.favoriteId));
            if (!fav) return corsJson({ error: 'favorite not found' }, 400);
            if (!isValidIsoDate(json.date)) return corsJson({ error: 'date required' }, 400);
            const items = parseWorkoutIdList(fav.workoutIdList).map((entry, i) => ({
                slotId: i + 1, id: entry.id, orderingType: entry.orderingType, isLogged: false,
            }));
            const doc = { seeded: false, favoriteId: fav.favoriteId, items };
            await writeDayDoc(userId, 'byo', json.date, doc);
            // Legacy response: the day object the thunk swaps in.
            return corsJson(hydrateDay(doc, json.dayIndex ?? 0));
        }

        // default: create
        const favorite = {
            favoriteId: favorites.reduce((m, f) => Math.max(m, Number(f.favoriteId) || 0), 0) + 1,
            userId,
            title: json.title || '',
            description: json.description || '',
            workoutIdList: json.workoutIdList || '',
            dateCreated: json.dateCreated || new Date().toISOString().slice(0, 10),
        };
        favorites.push(favorite);
        await writeWorkoutState(userId, 'byo_favorites', { ...state, favorites });

        // Stamp the source day's doc with the new favoriteId (legacy behavior).
        if (isValidIsoDate(json.date)) {
            const doc = await readDayDoc(userId, 'byo', json.date);
            if (doc) {
                doc.favoriteId = favorite.favoriteId;
                await writeDayDoc(userId, 'byo', json.date, doc);
            }
        }
        return corsJson(favorite);
    } catch (error) {
        logger.error('workout.byo_favorites.error', { ...logCtx, method: 'POST', error });
        return corsJson({ error: error.message }, 400);
    }
}

export async function DELETE(request) {
    let logCtx = {};
    try {
        const json = await request.json();
        const { userId, favoriteId } = json;
        logCtx = { userId };
        if (!userId || favoriteId === undefined) return corsJson({ error: 'userId and favoriteId required' }, 400);
        const { data } = await readWorkoutState(userId, 'byo_favorites');
        const state = data || {};
        state.favorites = (state.favorites || []).filter(f => f.favoriteId !== Number(favoriteId));
        await writeWorkoutState(userId, 'byo_favorites', state);
        return corsJson({ status: 200 });
    } catch (error) {
        logger.error('workout.byo_favorites.error', { ...logCtx, method: 'DELETE', error });
        return corsJson({ error: error.message }, 400);
    }
}
