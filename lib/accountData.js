/**
 * lib/accountData.js — modular, resilient section fetchers for the "My Account"
 * dashboard (`/accountDetails`).
 *
 * CONTRACT (read before building visuals):
 *   - One independent async fetcher per dashboard section.
 *   - EVERY fetcher is fully wrapped in try/catch and returns `null` on ANY failure
 *     (never throws). A `null` return means "hide this section" — the page composes
 *     these with `Promise.allSettled` so one broken source can never blank the page.
 *   - A fetcher returns its section object ONLY when it has real data to show;
 *     otherwise `null`. (Support is the one exception — it returns an object with
 *     possibly-empty arrays so the section can still offer a Contact button.)
 *   - `user_setting.data` is a TEXT column holding JSON — always `JSON.parse` it.
 *   - `user_logs.data` / `progressions` are Postgres `json` — already parsed objects.
 *
 * The exact returned SHAPE of each fetcher is documented in its own JSDoc below.
 * Batch-2 agents build the visuals against these props — do not change a shape
 * without updating the consuming section component.
 */

import { db } from '@/Drizzle/index.ts';
import {
    user,
    user_logs,
    support_cases,
    outbound_emails,
    app_logs,
} from '@/Drizzle/db/schema';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { queryUserSetting, getUserWithId } from '@/lib/userSettings';
import { fetchUserSupportHistory } from '@/lib/userHelpers';
import { isSubscriptionActive, subscriptionStatusLabel, cleanPlanName } from '@/lib/subscription';

// Level id -> display name. Mirrors app/api/user/workout/standing/route.js:16-19.
const LEVEL_NAMES = {
    0: 'Beginner',
    1: 'Intermediate One',
    2: 'Intermediate Two',
    3: 'Advanced One',
    4: 'Advanced Two',
    9: 'White Board',
    10: 'Build Your Own',
};

// ─── small internal helpers ──────────────────────────────────────────────────

function safeParse(text) {
    if (!text) return {};
    if (typeof text === 'object') return text;
    try { return JSON.parse(text); } catch { return {}; }
}

function isIsoDate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s);
}

function toDateKey(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

/**
 * Profile section — reads name/email straight from the `user` table (the reliable
 * source), phone/country from the subscription setting's data JSON. Decoupled from the
 * fragile legacy getAccountInformation (whose Auth.net enrichment could blank the name).
 * @returns {Promise<null | { name: string, email: string, phone: string|null, country: string|null }>}
 */
export async function getProfileSection(userId) {
    try {
        if (!userId) return null;
        const rows = await db
            .select({ name: user.name, email: user.email })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);
        const u = rows[0];
        if (!u) return null;

        const setting = await queryUserSetting(userId, 'subscription');
        const d = safeParse(setting?.data);
        const clean = (v) => (v && v !== 'N/A' ? v : null);

        return {
            name: u.name || clean(d.first_name) || '',
            email: u.email || clean(d.email) || '',
            phone: clean(d.phone),
            country: clean(d.country),
        };
    } catch {
        return null;
    }
}

// Count "logged" activity in a single user_logs day-document, per section shape.
// (see claudePlans/my-account-dashboard-data-inventory.md §1 for the real shapes)
function countLogged(section, data) {
    if (!data) return 0;
    try {
        if (section === 'levels') {
            return Array.isArray(data)
                ? data.filter((it) => it?.isLogged ?? it?.workout?.isLogged).length
                : 0;
        }
        if (section === 'history') {
            return Array.isArray(data?.entries) ? data.entries.length : 0;
        }
        if (section === 'byo') {
            return Array.isArray(data?.items) ? data.items.filter((i) => i?.isLogged).length : 0;
        }
        if (section === 'autopilot') {
            return Array.isArray(data?.exercises) ? data.exercises.filter((e) => e?.isLogged).length : 0;
        }
        return 0;
    } catch {
        return 0;
    }
}

// ─── 1. Subscription & dates ─────────────────────────────────────────────────
/**
 * getSubscriptionSection(userId)
 * Source: `user_setting` type='subscription' (the core profile/subscription row).
 * Status is ALWAYS derived date-based via lib/subscription (renewaldate), NEVER the
 * raw `user_setting.status` string.
 *
 * @returns {Promise<null | {
 *   statusLabel: 'Active' | 'Trial' | 'Expired',   // date-derived label
 *   isActive: boolean,                              // future renewaldate === active
 *   renewalDate: string | null,                     // raw renewaldate value (ISO-ish) or null
 *   planName: string,                               // e.g. 'GymFit Membership'
 *   term: string | null                             // 'monthly' | 'annually' | 'quarterly' | null
 * }>}
 */
export async function getSubscriptionSection(userId) {
    try {
        if (!userId) return null;
        const setting = await queryUserSetting(userId, 'subscription');
        if (!setting) return null;

        const data = safeParse(setting.data);
        const renewaldate = data?.renewaldate ?? data?.nextPaymentDate ?? null;
        const isActive = isSubscriptionActive({ renewaldate });
        // trialEndDate gives the label real in-trial evidence — the bare trial flag
        // is never cleared after signup, so it alone must not produce 'Trial'.
        const statusLabel = subscriptionStatusLabel({ renewaldate, trial: setting.trial, trialEndDate: setting.trialEndDate });

        const cleanRenewal = renewaldate && renewaldate !== 'N/A' ? renewaldate : null;
        const cleanTerm = data?.term && data.term !== 'N/A' ? data.term : null;

        return {
            statusLabel,
            isActive,
            renewalDate: cleanRenewal,
            planName: cleanPlanName(data?.productName) || 'GymFit Membership',
            term: cleanTerm,
        };
    } catch {
        return null;
    }
}

// ─── 2. Payment method ───────────────────────────────────────────────────────
/**
 * getPaymentSection(userId)
 * Source: `user_setting` type='subscription' — `stripe_customer_id` COLUMN plus
 * `data.paymentMethodId` / `data.cardBrand` / `data.cardLast4` (written by
 * updateUserSettingPaymentMethod in lib/userSettings.js).
 *
 * @returns {Promise<null | {
 *   hasCard: boolean,          // true when a saved payment method exists
 *   cardBrand: string | null,  // e.g. 'visa' (null when !hasCard)
 *   cardLast4: string | null   // e.g. '4242' (null when !hasCard)
 * }>}
 * Returns null only when the user has no subscription setting row at all.
 * When a row exists but no card is saved, returns { hasCard:false } so the
 * PaymentSection can render its "Add payment method" flow.
 */
export async function getPaymentSection(userId) {
    try {
        if (!userId) return null;
        const setting = await queryUserSetting(userId, 'subscription');
        if (!setting) return null;

        const data = safeParse(setting.data);
        const hasCard = !!(data?.cardLast4 || data?.paymentMethodId);

        return {
            hasCard,
            cardBrand: hasCard ? (data?.cardBrand ?? null) : null,
            cardLast4: hasCard ? (data?.cardLast4 ?? null) : null,
        };
    } catch {
        return null;
    }
}

// ─── 3. Account activity (support/admin actions on the account) ──────────────

// Log events that represent a support/admin ACTION taken ON the account and are
// safe/useful to surface to the member. Anything not in this list is dropped.
const ACTIVITY_EVENTS = [
    'admin.grant_access',        // membership credit / access grant
    'admin.extend_subscription', // access extension
    'admin.cancel_subscription', // admin-initiated cancellation
    'admin.refund',              // refund issued
    'admin.password_reset_sent', // password reset email sent by support
    'admin.temp_password_set',   // temporary password set by support
    'cancellation.trial_cancel', // self-serve trial cancellation
    'cancellation.active_cancel',// self-serve active-sub cancellation
    'renewal.success',           // successful renewal
];

// Coerce an ISO string, ms epoch, epoch-seconds, or Date into a Date (or null).
function coerceDate(value) {
    if (value == null) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number') {
        // Heuristic: 10-digit epoch seconds vs 13-digit ms. Stripe accessUntil
        // values are epoch SECONDS; app_logs.ts / expiresAt are ISO/ms.
        const ms = value < 1e12 ? value * 1000 : value;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

// "Mar 14, 2027" — formatted in UTC so a 23:59:59Z expiry doesn't slip a day.
function formatFriendlyDate(value) {
    const d = coerceDate(value);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
}

function isFarFuture(value) {
    const d = coerceDate(value);
    return d ? d.getUTCFullYear() >= 2099 : false;
}

function formatMoney(amountCents, currency) {
    if (amountCents == null || isNaN(Number(amountCents))) return '';
    const value = Number(amountCents) / 100;
    try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(value);
    } catch {
        return `$${value.toFixed(2)}`;
    }
}

// Migration/billing-fix grants get a plain-English reason appended to the detail.
function migrationReasonPhrase(source, data) {
    const src = (source || '').toLowerCase();
    const reason = (data?.reason || '').toLowerCase();
    if (src.includes('billing') || src.includes('migration') || reason.includes('billing') || reason.includes('migration')) {
        return 'billing correction';
    }
    return null;
}

// Map one app_logs row to a friendly timeline item, or null to drop it.
function mapActivityRow(row) {
    const event = row?.event;
    const date = row?.ts ?? null; // when the action happened
    const source = row?.source ?? null;
    // app_logs.data is Postgres `json` (already parsed); safeParse guards the odd string.
    const data = row?.data && typeof row.data === 'object' ? row.data : safeParse(row?.data);

    switch (event) {
        case 'admin.grant_access': {
            const hasCredit = data?.bonusMonths != null && Number(data.bonusMonths) > 0;
            const indefinite = data?.days === 'indefinite' || isFarFuture(data?.expiresAt);
            const label = hasCredit ? 'Membership credit applied' : 'Access extended';
            let detail;
            if (indefinite) {
                detail = hasCredit ? 'Complimentary membership credit applied' : 'Indefinite access granted';
            } else if (hasCredit) {
                detail = `${Number(data.bonusMonths)}-month credit — active through ${formatFriendlyDate(data.expiresAt)}`;
            } else {
                detail = data?.expiresAt
                    ? `Access extended through ${formatFriendlyDate(data.expiresAt)}`
                    : 'Your membership access was extended';
            }
            const reason = migrationReasonPhrase(source, data);
            if (reason) detail += ` · ${reason}`;
            return { date, label, detail };
        }
        case 'admin.extend_subscription': {
            const when = data?.newPeriodEnd || data?.newRenewalDate;
            const detail = when
                ? `Access extended through ${formatFriendlyDate(when)}`
                : 'Your membership access was extended';
            return { date, label: 'Access extended', detail };
        }
        case 'renewal.success': {
            return { date, label: 'Subscription renewed', detail: 'Your membership was renewed successfully' };
        }
        case 'admin.cancel_subscription':
        case 'cancellation.active_cancel': {
            const when = data?.accessUntil;
            const detail = when
                ? `Cancelled — access continues through ${formatFriendlyDate(when)}`
                : 'Your subscription was cancelled';
            return { date, label: 'Subscription cancelled', detail };
        }
        case 'cancellation.trial_cancel': {
            return { date, label: 'Subscription cancelled', detail: 'Your free trial was cancelled — you will not be charged' };
        }
        case 'admin.refund': {
            const amt = formatMoney(data?.amount, data?.currency);
            const detail = amt ? `${amt} refunded to your payment method` : 'A refund was issued to your payment method';
            return { date, label: 'Refund issued', detail };
        }
        case 'admin.password_reset_sent': {
            return { date, label: 'Password reset email sent', detail: 'A password reset link was sent to your email address' };
        }
        case 'admin.temp_password_set': {
            return { date, label: 'Password reset email sent', detail: 'A temporary password was set on your account by support' };
        }
        default:
            return null;
    }
}

/**
 * getActivitySection(userId)
 * Source: `app_logs` — support/admin ACTIONS taken on this account (keyed by
 * `user_id`), which are otherwise invisible to the member. Covers membership
 * credits & access grants, subscription extensions, renewals, cancellations,
 * refunds, and password resets. Uses `app_logs.ts` as the item date and the
 * (already-parsed json) `app_logs.data` blob for human-readable details. Only
 * events in ACTIVITY_EVENTS are surfaced; anything else is dropped.
 *
 * @returns {Promise<null | {
 *   items: Array<{
 *     date: string | number,   // ISO string / ms epoch — when the action happened (app_logs.ts)
 *     label: string,           // short friendly headline e.g. 'Membership credit applied'
 *     detail: string           // one-line explanation e.g. '6-month credit — active through Mar 14, 2027 · billing correction'
 *   }>                          // sorted NEWEST-FIRST
 * }>}
 * Returns null when there are no surfaceable action events (or on any error).
 */
export async function getActivitySection(userId) {
    try {
        if (!userId) return null;

        const rows = await db
            .select({
                event: app_logs.event,
                ts: app_logs.ts,
                source: app_logs.source,
                data: app_logs.data,
            })
            .from(app_logs)
            .where(and(eq(app_logs.userId, userId), inArray(app_logs.event, ACTIVITY_EVENTS)))
            .orderBy(desc(app_logs.ts));

        const items = (rows ?? [])
            .map(mapActivityRow)
            .filter(Boolean)
            .sort((a, b) => {
                const ta = new Date(a.date).getTime();
                const tb = new Date(b.date).getTime();
                return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta); // newest-first
            });

        if (items.length === 0) return null;
        return { items };
    } catch {
        return null;
    }
}

// ─── 4. Workout history ──────────────────────────────────────────────────────
/**
 * getWorkoutHistorySection(userId)
 * Source: `user_logs`, all workout sections (levels + history + byo + autopilot;
 * 'thrive' is nutrition and is excluded here).
 * DATE-AXIS RULE (baked in): section='levels' uses `created_at`; all migration
 * sections use ISO `user_schedule_date` (falling back to created_at if not ISO).
 *
 * @returns {Promise<null | {
 *   days: Array<{ date: string, count: number }>,   // per-day logged-workout count, date = 'YYYY-MM-DD', sorted ascending
 *   total: number,                                   // sum of all logged workouts across days
 *   sections: { [section: string]: { docs: number, logged: number } } // per-section day-doc count + logged count
 * }>}
 * Returns null when the user has zero workout log rows.
 */
export async function getWorkoutHistorySection(userId) {
    try {
        if (!userId) return null;

        const rows = await db
            .select({
                section: user_logs.section,
                data: user_logs.data,
                userScheduleDate: user_logs.userScheduleDate,
                createdAt: user_logs.createdAt,
            })
            .from(user_logs)
            .where(eq(user_logs.userId, userId));

        const workoutRows = (rows ?? []).filter((r) => (r.section || 'levels') !== 'thrive');
        if (workoutRows.length === 0) return null;

        const dayMap = new Map(); // dateKey -> logged count
        const sections = {};      // section -> { docs, logged }

        for (const row of workoutRows) {
            const section = row.section || 'levels';
            const dateKey = section === 'levels'
                ? toDateKey(row.createdAt)
                : (isIsoDate(row.userScheduleDate) ? row.userScheduleDate.slice(0, 10) : toDateKey(row.createdAt));

            const logged = countLogged(section, row.data);

            if (!sections[section]) sections[section] = { docs: 0, logged: 0 };
            sections[section].docs += 1;
            sections[section].logged += logged;

            if (dateKey) {
                dayMap.set(dateKey, (dayMap.get(dateKey) || 0) + logged);
            }
        }

        const days = Array.from(dayMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => (a.date < b.date ? -1 : 1));

        const total = days.reduce((sum, d) => sum + d.count, 0);

        // Hide the section entirely when there are no LOGGED workouts (e.g. a user
        // with only scheduled-but-uncompleted rows) so it doesn't render an empty grid.
        if (total === 0 || days.length === 0) return null;

        return { days, total, sections };
    } catch {
        return null;
    }
}

// ─── 5. Levels & progression ─────────────────────────────────────────────────
/**
 * getLevelsSection(userId)
 * Source: `user_setting` type='workout_level' (new, `data.levelId`) with legacy
 * fallback type='levelPath' (`data.leveld`). `byo_settings` gives a count of
 * per-exercise customized progressions.
 *
 * @returns {Promise<null | {
 *   level: string,                                    // display name e.g. 'Intermediate One'
 *   levelId: number,                                  // raw level id
 *   disciplines: Array<{ name: string, progress: number }>, // EMPTY in CORE — Batch 2 hydrates per-discipline mastery bars via lib/curriculum.js
 *   customizedProgressions: number                    // # of byo_settings exercise picks
 * }>}
 * Returns null when neither workout_level nor levelPath yields a level.
 */
export async function getLevelsSection(userId) {
    try {
        if (!userId) return null;

        const [workoutLevel, levelPath, byoSettings] = await Promise.all([
            queryUserSetting(userId, 'workout_level'),
            queryUserSetting(userId, 'levelPath'),
            queryUserSetting(userId, 'byo_settings'),
        ]);

        let levelId = null;
        const wl = safeParse(workoutLevel?.data);
        if (wl?.levelId !== undefined && wl?.levelId !== null) levelId = Number(wl.levelId);
        if (levelId === null) {
            const lp = safeParse(levelPath?.data);
            if (lp?.leveld !== undefined && lp?.leveld !== null) levelId = Number(lp.leveld);
        }
        if (levelId === null || isNaN(levelId)) return null;

        const level = LEVEL_NAMES[levelId] ?? `Level ${levelId}`;

        const byo = safeParse(byoSettings?.data);
        const customizedProgressions = byo?.exercises ? Object.keys(byo.exercises).length : 0;

        // disciplines are left empty in the CORE build; Batch 2 hydrates per-discipline
        // mastery bars (Core/Upper Body/Lower Body/Handstand/Movement/Rings) via lib/curriculum.js.
        return { level, levelId, disciplines: [], customizedProgressions };
    } catch {
        return null;
    }
}

// ─── 6. Nutrition / Thrive ───────────────────────────────────────────────────
/**
 * getThriveSection(userId)
 * Source: `user_logs` section='thrive' (daily tasks + measurements) plus
 * `user_setting` type='thrive_profile' (body profile + photos) and
 * type='thrive_state' (unlocked task permissions).
 *
 * @returns {Promise<null | {
 *   profile: null | { weight, height1, height2, units },   // ONLY the fields ThriveSection renders — photo URLs (beforeImg/currentImg) are stripped before this leaves the server
 *   weightSeries: Array<{ date: string, weight: number }>, // measurements over time, sorted ascending
 *   counts: { tasksCompleted: number, permissionsUnlocked: number, measurements: number }
 * }>}
 * Returns null when the user has no thrive profile, no unlocked permissions, and no thrive logs.
 */
export async function getThriveSection(userId) {
    try {
        if (!userId) return null;

        const [profileSetting, stateSetting, thriveLogs] = await Promise.all([
            queryUserSetting(userId, 'thrive_profile'),
            queryUserSetting(userId, 'thrive_state'),
            db
                .select({
                    data: user_logs.data,
                    userScheduleDate: user_logs.userScheduleDate,
                    createdAt: user_logs.createdAt,
                })
                .from(user_logs)
                .where(and(eq(user_logs.userId, userId), eq(user_logs.section, 'thrive'))),
        ]);

        const rawProfile = profileSetting?.data ? safeParse(profileSetting.data) : null;
        // Only ship the fields ThriveSection actually renders — the raw profile also
        // carries beforeImg/currentImg photo URLs that must not reach the client.
        const profile = rawProfile
            ? {
                weight: rawProfile.weight ?? null,
                height1: rawProfile.height1 ?? null,
                height2: rawProfile.height2 ?? null,
                units: rawProfile.units ?? null,
            }
            : null;

        const state = safeParse(stateSetting?.data);
        const permissionsUnlocked = Array.isArray(state?.permissions) ? state.permissions.length : 0;

        const logs = thriveLogs ?? [];
        const weightSeries = [];
        let tasksCompleted = 0;

        for (const row of logs) {
            const d = row.data || {};
            if (d?.measurement?.weight != null) {
                const date = d.measurement.date
                    ?? (isIsoDate(row.userScheduleDate) ? row.userScheduleDate : toDateKey(row.createdAt));
                if (date) weightSeries.push({ date, weight: Number(d.measurement.weight) });
            }
            if (Array.isArray(d?.tasks)) tasksCompleted += d.tasks.filter((t) => t?.complete).length;
        }
        weightSeries.sort((a, b) => (a.date < b.date ? -1 : 1));

        if (!profile && permissionsUnlocked === 0 && logs.length === 0) return null;

        return {
            profile,
            weightSeries,
            counts: {
                tasksCompleted,
                permissionsUnlocked,
                measurements: weightSeries.length,
            },
        };
    } catch {
        return null;
    }
}

// ─── 7. Preferences ──────────────────────────────────────────────────────────
/**
 * getPreferencesSection(userId)
 * Source: `user_setting` types 'byo_settings', 'autopilot_state', 'byo_favorites'.
 *
 * @returns {Promise<null | {
 *   items: Array<{ label: string, value: string }>   // labelled preference rows, only non-empty ones
 * }>}
 * Returns null when the user has none of these preference rows populated.
 */
export async function getPreferencesSection(userId) {
    try {
        if (!userId) return null;

        const [byoSettings, autopilotState, byoFavorites] = await Promise.all([
            queryUserSetting(userId, 'byo_settings'),
            queryUserSetting(userId, 'autopilot_state'),
            queryUserSetting(userId, 'byo_favorites'),
        ]);

        const items = [];

        const ap = safeParse(autopilotState?.data);
        if (ap?.level !== undefined && ap?.level !== null) {
            items.push({ label: 'White Board Level', value: LEVEL_NAMES[Number(ap.level)] ?? String(ap.level) });
        }
        if (Array.isArray(ap?.favorites) && ap.favorites.length) {
            items.push({ label: 'AutoPilot Favorites', value: String(ap.favorites.length) });
        }

        const byo = safeParse(byoSettings?.data);
        const progCount = byo?.exercises ? Object.keys(byo.exercises).length : 0;
        if (progCount) items.push({ label: 'Customized Progressions', value: String(progCount) });

        const fav = safeParse(byoFavorites?.data);
        const favCount = Array.isArray(fav?.favorites) ? fav.favorites.length : 0;
        if (favCount) items.push({ label: 'Saved Favorite Days', value: String(favCount) });

        if (items.length === 0) return null;
        return { items };
    } catch {
        return null;
    }
}

// ─── 8. Support & email history (two-way "Messages & Cases") ──────────────────
/**
 * getSupportSection(userId)
 * Source: reuses fetchUserSupportHistory (inbound support_emails + case join),
 * plus this user's `support_cases` and `outbound_emails` (keyed by user_id OR
 * email address, since those tables' user_id is nullable).
 *
 * @returns {Promise<null | {
 *   messages: Array<{
 *     id: string,                    // 'in-<id>' | 'out-<id>'
 *     direction: 'inbound' | 'outbound',
 *     subject: string,
 *     body: string,
 *     date: string | Date,           // receivedAt (inbound) / sentAt (outbound)
 *     status?: string,               // inbound only
 *     caseId?: number | null,
 *     caseTitle?: string | null,     // inbound only
 *     campaign?: string | null,      // outbound only
 *     type?: string                  // outbound only ('support' | 'marketing')
 *   }>,                              // sorted CHRONOLOGICALLY (ascending by date)
 *   cases: Array<{
 *     id: number, title: string, status: string, priority: string,
 *     createdAt: Date, resolvedAt: Date | null
 *   }>
 * }>}
 * Returns { messages:[], cases:[] } (not null) when there is no history, so the
 * section can still show a Contact Support entry point. Returns null only on error.
 */
export async function getSupportSection(userId) {
    try {
        if (!userId) return null;

        const user = await getUserWithId(userId);
        const email = user?.email ?? null;

        // Inbound support emails (reuse existing helper — keyed by user_id).
        let inbound = [];
        try {
            inbound = await fetchUserSupportHistory(userId);
        } catch {
            inbound = [];
        }

        // Cases — user_id OR from_email.
        let cases = [];
        try {
            const where = email
                ? or(eq(support_cases.userId, userId), eq(support_cases.fromEmail, email))
                : eq(support_cases.userId, userId);
            cases = await db
                .select({
                    id: support_cases.id,
                    title: support_cases.title,
                    status: support_cases.status,
                    priority: support_cases.priority,
                    createdAt: support_cases.createdAt,
                    resolvedAt: support_cases.resolvedAt,
                })
                .from(support_cases)
                .where(where)
                .orderBy(desc(support_cases.createdAt));
        } catch {
            cases = [];
        }

        // Outbound emails — user_id OR to_email.
        let outbound = [];
        try {
            const where = email
                ? or(eq(outbound_emails.userId, userId), eq(outbound_emails.toEmail, email))
                : eq(outbound_emails.userId, userId);
            outbound = await db
                .select({
                    id: outbound_emails.id,
                    subject: outbound_emails.subject,
                    body: outbound_emails.body,
                    campaign: outbound_emails.campaign,
                    type: outbound_emails.type,
                    sentAt: outbound_emails.sentAt,
                    caseId: outbound_emails.caseId,
                })
                .from(outbound_emails)
                .where(where)
                .orderBy(desc(outbound_emails.sentAt));
        } catch {
            outbound = [];
        }

        const messages = [
            ...(inbound ?? []).map((m) => ({
                id: `in-${m.id}`,
                direction: 'inbound',
                subject: m.subject,
                body: m.body,
                date: m.receivedAt,
                status: m.status,
                caseId: m.caseId ?? null,
                caseTitle: m.caseTitle ?? null,
            })),
            ...(outbound ?? []).map((m) => ({
                id: `out-${m.id}`,
                direction: 'outbound',
                subject: m.subject,
                body: m.body,
                date: m.sentAt,
                campaign: m.campaign ?? null,
                type: m.type,
                caseId: m.caseId ?? null,
            })),
        ].sort((a, b) => {
            const ta = new Date(a.date).getTime();
            const tb = new Date(b.date).getTime();
            return (isNaN(ta) ? 0 : ta) - (isNaN(tb) ? 0 : tb);
        });

        return { messages, cases };
    } catch {
        return null;
    }
}
