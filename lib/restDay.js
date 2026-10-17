/**
 * lib/restDay.js — what "add a workout" puts on a guided-plan rest day (Sunday).
 *
 * The level templates (data/workout/levelSchedules.json) define Monday–Saturday only, so
 * "Generate Workout" (fill-day-from-template) has nothing to copy on Sunday. The old app
 * showed a rest-day picker instead — "This is a default Rest Day, but you can add a workout"
 * with Upper Body / Core/Lower body / Stretch / Core/UpperBody — and 4,303 imported AWS weeks
 * carry Sunday classes. my. commit 499a36d (2026-08-19) hid that picker; this restores it,
 * mapping each option to the member's own level's real classes.
 *
 * Option (1-based, the picker's order):
 *   1 Upper Body      -> the level's Upper Body day (template day 1)
 *   2 Core/Lower body -> the level's Core + Lower Body day (template day 2)
 *   3 Stretch         -> Thoracic Bridge (59222) — the stretch the template week does not
 *                        already use (Front Split = day 3, Middle Split = day 6) and the most
 *                        common Sunday class in the imported AWS weeks (1,317)
 *   4 Core/UpperBody  -> the Upper Body day with Core added before Upper Body (AWS weeks
 *                        hold exactly this: e.g. [59600, 59614, 59207, 59219] at Level 1)
 */
const UPPER_BODY = 59219, CORE = 59207, THORACIC_BRIDGE = 59222;

export function restDayClassIds(levelTemplate, option) {
    const day = k => (levelTemplate?.[k] || []).map(i => Number(i.classId)).filter(Boolean);
    switch (Number(option)) {
        case 1: return day('1');
        case 2: return day('2');
        case 3: return [THORACIC_BRIDGE];
        case 4: {
            const ids = day('1');
            const at = ids.indexOf(UPPER_BODY);
            return at < 0 ? [...ids, CORE] : [...ids.slice(0, at), CORE, ...ids.slice(at)];
        }
        default: return [];
    }
}
