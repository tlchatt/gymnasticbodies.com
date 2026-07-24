// Single source of truth for whether a membership is currently active.
//
// "Active" is derived from the EXPIRATION DATE (renewaldate), NOT the freeform
// `user_setting.status` string — that string is set unreliably (WooCommerce imports
// stamp a placeholder 'Active', manual grants stamp 'active', cancellations rarely
// clear it) and must never be treated as truth for access.
//
// This mirrors the authoritative rule in app/api/classifyUsers/route.js
// (parseRenewalDate + `renewaldate > now` => current). Use these helpers everywhere
// a subscription's active/expired state is shown or gated (My Account + admin).

const ACTIVE_STRIPE_STATUSES = ['active', 'trialing'];

/**
 * Parse a renewal date out of a value that may be:
 *   - a JSON string of `user_setting.data` (has `.renewaldate` / `.nextPaymentDate`)
 *   - an already-parsed data object
 *   - a bare date string ("2027-03-14T...")
 *   - a Date
 * Requires an ISO-ish `YYYY-MM-DD` prefix (same guard as the classifier) so junk
 * like "N/A" is rejected. Returns a Date or null.
 */
export function parseRenewalDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

    let raw = value;
    if (typeof value === 'string' && value.trim().startsWith('{')) {
        try {
            const data = JSON.parse(value);
            raw = data?.renewaldate ?? data?.nextPaymentDate ?? null;
        } catch (_) {
            raw = null;
        }
    } else if (typeof value === 'object') {
        raw = value?.renewaldate ?? value?.nextPaymentDate ?? null;
    }

    if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
    if (raw && typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/**
 * Is the membership active RIGHT NOW?
 * True when the renewal (expiration) date is in the future, OR a live Stripe status
 * is active/trialing. Stripe is kept as an OR term so a fresh Stripe subscriber whose
 * cached `renewaldate` is momentarily stale never false-expires.
 *
 * @param {{ renewaldate?: any, stripeStatus?: string, now?: Date }} [opts]
 * @returns {boolean}
 */
export function isSubscriptionActive({ renewaldate, stripeStatus, now } = {}) {
    if (stripeStatus && ACTIVE_STRIPE_STATUSES.includes(stripeStatus)) return true;
    const d = parseRenewalDate(renewaldate);
    if (!d) return false;
    const ref = now instanceof Date ? now : new Date();
    return d.getTime() > ref.getTime();
}

/**
 * Human-facing status label derived the same way — ACTIVE-FIRST.
 * Active/Expired is decided from the expiration date (+ live Stripe status) BEFORE
 * any trial consideration; 'Trial' only ever refines an ACTIVE state.
 *
 * The bare `user_setting.trial` boolean is never cleared after signup (only the
 * migration importer ever writes false), so on its own it proves nothing — a
 * converted paying member or a lapsed ex-trialist still carries trial=true.
 * 'Trial' therefore requires demonstrable in-trial evidence: a live Stripe
 * 'trialing' status, OR the trial flag together with a stored `trialEndDate`
 * (user_setting.trial_end_date, set at signup) that is still in the future.
 * With no such evidence, an active user with a stale trial flag shows 'Active'.
 *
 * @param {{ renewaldate?: any, stripeStatus?: string, trial?: boolean, trialEndDate?: any, now?: Date }} [opts]
 * @returns {'Active'|'Trial'|'Expired'}
 */
export function subscriptionStatusLabel({ renewaldate, stripeStatus, trial, trialEndDate, now } = {}) {
    if (!isSubscriptionActive({ renewaldate, stripeStatus, now })) return 'Expired';
    if (stripeStatus === 'trialing') return 'Trial';
    if (trial && trialEndDate) {
        const end = trialEndDate instanceof Date ? trialEndDate : new Date(trialEndDate);
        const ref = now instanceof Date ? now : new Date();
        if (!isNaN(end.getTime()) && end.getTime() > ref.getTime()) return 'Trial';
    }
    return 'Active';
}
