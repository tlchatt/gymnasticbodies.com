/**
 * Shared BYO day-doc hydration — used by the byo route (weekly view / op responses)
 * and the favorites route (apply response). Not a route file.
 */
import { AP_BY_ID, repsOrSecsDisplay } from "@/lib/workout";
import byoWorkouts from "@/data/workout/byoWorkouts.json";

export const PROGRAM_IDS = {
    59207: 'Core', 59219: 'Upper Body', 59213: 'Lower Body',
    59225: 'Handstand', 59228: 'Movement', 60099: 'Rings',
};
export const CLASS_BY_ID = new Map(byoWorkouts.map(w => [Number(w.classId), w]));

export const emptyByoDay = doc => !doc || !(doc.items || []).length;

export function itemType(id) {
    if (PROGRAM_IDS[id]) return 'Program';
    if (CLASS_BY_ID.has(Number(id))) return 'Class';
    return 'Exercise';
}

export function hydrateItem(item, dayIndex) {
    const id = Number(item.id);
    const type = itemType(id);
    const base = {
        scheduleId: item.slotId,
        classOrProgOrExId: id,
        orderingType: Number(item.orderingType),
        type,
        dayIndex,
    };
    if (type === 'Class') {
        const w = CLASS_BY_ID.get(id);
        return {
            ...base,
            classOrProgOrExName: w.className,
            image: w.image || '',
            category: w.category || '',
            workout: { mediaId: w.mediaId, description: w.description || '', isLogged: !!item.isLogged },
        };
    }
    if (type === 'Program') {
        // Frontend enriches Program display from its own idToClass map — minimal payload.
        return {
            ...base,
            classOrProgOrExName: PROGRAM_IDS[id],
            image: '',
            category: 'Programs',
            workout: { isLogged: !!item.isLogged },
        };
    }
    // Exercise — BYO individual exercises are keyed on autoPilotExerciseId
    // (== individualExerciseId), NOT the catalog's separate exerciseId field.
    const cat = AP_BY_ID.get(id);
    return {
        ...base,
        classOrProgOrExName: cat ? cat.exerciseName : `Exercise ${id}`,
        image: cat ? cat.imageUrl : '',
        category: cat ? cat.category : '',
        workout: cat ? {
            videos: (cat.videos || []).map(v => ({ mediaId: v.mediaId, version: v.version })),
            isLogged: !!item.isLogged,
            repsOrSecs: repsOrSecsDisplay(cat.secsOrReps),
            rounds: item.rounds ?? 1,
            numOfSecsOrRepsLogged: item.numOfSecsOrRepsLogged ?? null,
        } : null,
    };
}

export function hydrateDay(doc, dayIndex) {
    if (emptyByoDay(doc)) return null;
    return {
        favoriteId: doc.favoriteId ?? null,
        workoutsInADayList: (doc.items || []).map(it => hydrateItem(it, dayIndex)),
    };
}
