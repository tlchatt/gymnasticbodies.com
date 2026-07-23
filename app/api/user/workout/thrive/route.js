/**
 * /api/user/workout/thrive — Neon replacement for the AWS /thrive/* endpoints.
 *
 * Storage:
 *   user_setting type='thrive_profile' : { units, height1, height2, weight,
 *       beforeImg, beforeImgDate, currentImg, currentImgDate }   (imgs = Blob URLs)
 *   user_setting type='thrive_state'   : { permissions: [{taskId, validFrom}] }
 *   user_logs  section='thrive'        : { seeded?, tasks: [{taskId, complete}], measurement? }
 *
 * The active task set for a date = task definitions whose taskId has a permission with
 * validFrom <= date (thrive_micro_permissions seeded from AWS carries future-dated grants,
 * so progression over time is data-driven, matching the legacy behavior).
 *
 * GET  ?userId=&view=tasks[&date=]   -> [{usersTaskId, taskNo, description, image, isCompleted}]
 * GET  ?userId=&view=lessons         -> [{taskNo, description, detailedDesc, detailsVideo, lessonName, lessonVideo, lesson}]
 * GET  ?userId=&view=profile         -> { weight, height1, height2, units, beforeImg, beforeImgDate, currentImg, currentImgDate }
 * POST { userId, op, ... }           ops: permissions | log-tasks | profile-save (multipart) | unlock | reset | reset-permissions
 *   (profile-save arrives as multipart/form-data: beforeImg, currentImg, myProfileRequest)
 */
import { put } from '@vercel/blob';
import {
    corsJson, corsOptions, isValidIsoDate,
    readWorkoutState, writeWorkoutState,
    readDayDoc, writeDayDoc,
} from "@/lib/workout";
import { db } from "@/Drizzle/index.ts";
import { user_logs } from "@/Drizzle/db/schema";
import { eq, and } from 'drizzle-orm';
import thriveDefs from "@/data/workout/thriveTasks.json";

export async function OPTIONS() { return corsOptions(); }

const DEFS_BY_ID = new Map(thriveDefs.map(d => [Number(d.taskId), d]));
const LESSON_DEFS = thriveDefs.filter(d => d.lessonName).sort((a, b) => Number(a.taskNo) - Number(b.taskNo));
// Starter grant for a user with no seeded permissions: the daily baseline tasks
// (dayOfWeek -1 defs) plus the first numbered task.
const STARTER_TASK_IDS = [
    ...thriveDefs.filter(d => Number(d.dayOfWeek) === -1).map(d => Number(d.taskId)),
    ...thriveDefs.filter(d => Number(d.taskNo) === 1 && d.lessonName).slice(0, 1).map(d => Number(d.taskId)),
];

const todayIso = () => new Date().toISOString().slice(0, 10);

function activeTaskIds(state, dateIso) {
    return new Set((state?.permissions || [])
        .filter(p => !p.validFrom || String(p.validFrom).slice(0, 10) <= dateIso)
        .map(p => Number(p.taskId)));
}

async function buildTasks(userId, dateIso) {
    const { data: state } = await readWorkoutState(userId, 'thrive_state');
    const active = activeTaskIds(state, dateIso);
    const doc = await readDayDoc(userId, 'thrive', dateIso);
    const completed = new Set((doc?.tasks || []).filter(t => t.complete).map(t => Number(t.taskId)));
    return thriveDefs
        .filter(d => active.has(Number(d.taskId)))
        .sort((a, b) => Number(a.taskNo) - Number(b.taskNo))
        .map(d => ({
            usersTaskId: Number(d.taskId),   // stable synthetic id — clients echo it to log-tasks
            taskNo: Number(d.taskNo),
            description: d.description,
            image: d.image || '',
            isCompleted: completed.has(Number(d.taskId)),
        }));
}

export async function GET(request) {
    try {
        const p = request.nextUrl.searchParams;
        const userId = p.get('userId');
        const view = p.get('view');
        if (!userId || !view) return corsJson({ error: 'userId and view required' }, 400);

        if (view === 'tasks') {
            const date = isValidIsoDate(p.get('date')) ? p.get('date') : todayIso();
            return corsJson(await buildTasks(userId, date));
        }

        if (view === 'lessons') {
            const { data: state } = await readWorkoutState(userId, 'thrive_state');
            const active = activeTaskIds(state, todayIso());
            const lessons = LESSON_DEFS
                .filter(d => active.has(Number(d.taskId)))
                .map(d => ({
                    taskNo: Number(d.taskNo),
                    description: d.description,
                    detailedDesc: d.detailedDesc,
                    detailsVideo: d.detailsVideo,
                    lessonName: d.lessonName,
                    lessonVideo: d.lessonVideo,
                    lesson: d.lesson,
                }));
            return corsJson(lessons);
        }

        if (view === 'profile') {
            const { data } = await readWorkoutState(userId, 'thrive_profile');
            return corsJson({
                height1: data?.height1 ?? null,
                height2: data?.height2 ?? null,
                weight: data?.weight ?? null,
                units: data?.units ?? 0,
                beforeImg: data?.beforeImg ?? null,
                beforeImgDate: data?.beforeImgDate ?? null,
                currentImg: data?.currentImg ?? null,
                currentImgDate: data?.currentImgDate ?? null,
            });
        }

        return corsJson({ error: `unknown view: ${view}` }, 400);
    } catch (error) {
        console.log('thrive GET error:', error);
        return corsJson({ error: error.message }, 400);
    }
}

async function uploadThriveImage(userId, file, kind) {
    if (!file || typeof file === 'string' || !file.size) return null;
    const ext = (file.name || 'photo.jpg').split('.').pop().toLowerCase() || 'jpg';
    const blob = await put(`thrive/${userId}/${kind}-${Date.now()}.${ext}`, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
}

export async function POST(request) {
    try {
        const contentType = request.headers.get('content-type') || '';

        // profile-save arrives as multipart/form-data (photos + myProfileRequest JSON)
        if (contentType.includes('multipart/form-data')) {
            const form = await request.formData();
            const userId = form.get('userId') || request.nextUrl.searchParams.get('userId');
            if (!userId) return corsJson({ error: 'userId required' }, 400);
            const profileReq = JSON.parse(form.get('myProfileRequest') || '{}');

            const { data: existing } = await readWorkoutState(userId, 'thrive_profile');
            const profile = existing || {};
            const beforeUrl = await uploadThriveImage(userId, form.get('beforeImg'), 'before');
            const currentUrl = await uploadThriveImage(userId, form.get('currentImg'), 'current');
            const now = todayIso();
            if (beforeUrl) { profile.beforeImg = beforeUrl; profile.beforeImgDate = now; }
            if (currentUrl) { profile.currentImg = currentUrl; profile.currentImgDate = now; }
            if (profileReq.units !== undefined) profile.units = profileReq.units;
            if (profileReq.height1 !== undefined) profile.height1 = profileReq.height1;
            if (profileReq.height2 !== undefined) profile.height2 = profileReq.height2;
            if (profileReq.weight !== undefined) profile.weight = profileReq.weight;
            await writeWorkoutState(userId, 'thrive_profile', profile);

            // Record the measurement on the day's thrive doc (thrive_measurements analogue)
            const doc = (await readDayDoc(userId, 'thrive', now)) || { tasks: [] };
            doc.measurement = { weight: profile.weight, height1: profile.height1, height2: profile.height2, units: profile.units, date: now };
            await writeDayDoc(userId, 'thrive', now, doc);
            return corsJson({ status: 200 });
        }

        const json = await request.json();
        const { userId, op } = json;
        if (!userId || !op) return corsJson({ error: 'userId and op required' }, 400);
        const date = isValidIsoDate(json.date) ? json.date : todayIso();

        switch (op) {
            case 'permissions': {
                // Welcome/init: grant the starter set if the user has no permissions yet.
                const { data: state } = await readWorkoutState(userId, 'thrive_state');
                if (!(state?.permissions || []).length) {
                    await writeWorkoutState(userId, 'thrive_state', {
                        ...(state || {}),
                        permissions: STARTER_TASK_IDS.map(taskId => ({ taskId, validFrom: date })),
                    });
                }
                return corsJson({ status: 200 });
            }

            case 'log-tasks': {
                // Legacy gate: a progress picture must exist before logging.
                const { data: profile } = await readWorkoutState(userId, 'thrive_profile');
                if (!profile?.beforeImg && !profile?.currentImg) {
                    return corsJson('Please upload picture before logging.');
                }
                const taskIds = String(json.taskIds || '').split(',').map(s => Number(s.trim())).filter(Boolean);
                const doc = (await readDayDoc(userId, 'thrive', date)) || { tasks: [] };
                const byId = new Map((doc.tasks || []).map(t => [Number(t.taskId), t]));
                for (const id of taskIds) byId.set(id, { taskId: id, complete: 1 });
                doc.tasks = [...byId.values()];
                await writeDayDoc(userId, 'thrive', date, doc);
                return corsJson(await buildTasks(userId, date));
            }

            case 'unlock': {
                // Bring the earliest not-yet-active permission forward; if everything is
                // active already, grant the next locked lesson.
                const { data: state } = await readWorkoutState(userId, 'thrive_state');
                const s = state || { permissions: [] };
                const perms = s.permissions || [];
                const future = perms
                    .filter(p => p.validFrom && String(p.validFrom).slice(0, 10) > date)
                    .sort((a, b) => String(a.validFrom).localeCompare(String(b.validFrom)));
                if (future.length) {
                    future[0].validFrom = date;
                } else {
                    const have = new Set(perms.map(p => Number(p.taskId)));
                    const next = LESSON_DEFS.find(d => !have.has(Number(d.taskId)));
                    if (next) perms.push({ taskId: Number(next.taskId), validFrom: date });
                }
                await writeWorkoutState(userId, 'thrive_state', { ...s, permissions: perms });
                return corsJson({ status: 200 });
            }

            case 'reset': {
                // Wipe the user's thrive day-docs (task history + measurements).
                await db.delete(user_logs).where(and(eq(user_logs.userId, userId), eq(user_logs.section, 'thrive')));
                return corsJson({ status: 200 });
            }

            case 'reset-permissions': {
                const { data: state } = await readWorkoutState(userId, 'thrive_state');
                await writeWorkoutState(userId, 'thrive_state', { ...(state || {}), permissions: [] });
                return corsJson({ status: 200 });
            }

            default:
                return corsJson({ error: `unknown op: ${op}` }, 400);
        }
    } catch (error) {
        console.log('thrive POST error:', error);
        return corsJson({ error: error.message }, 400);
    }
}

// The frontend's reset uses the DELETE verb (/thrive/reset/users/{id}) — mirror it.
export async function DELETE(request) {
    try {
        const json = await request.json();
        if (!json.userId) return corsJson({ error: 'userId required' }, 400);
        await db.delete(user_logs).where(and(eq(user_logs.userId, json.userId), eq(user_logs.section, 'thrive')));
        return corsJson({ status: 200 });
    } catch (error) {
        console.log('thrive DELETE error:', error);
        return corsJson({ error: error.message }, 400);
    }
}
