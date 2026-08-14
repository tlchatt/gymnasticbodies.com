import { getSiteSettings } from '@/lib/siteSettings';

/**
 * lib/pricing.js — the ONE source of truth for every price the app charges or shows.
 *
 * Owner rules (2026-08-13):
 *  - Defined rates only. Nothing is computed from another number. No annual, no "$/mo
 *    equivalent", no "save $X". Each of the four buckets is an explicit rate that admin sets.
 *  - Every price MENTION is {{variable}}-driven. No literal dollar figure lives in copy,
 *    components, or email templates — they carry tokens that this module resolves.
 *
 * The four buckets:
 *  1. subscribe       — new signups. ONE defined rate, one Stripe Price (stripePriceId).
 *  2a. renewNoHistory — lapsed member with no stored former rate. One defined rate.
 *  2b. (per-user)     — lapsed member WITH a stored former rate: honored exactly from
 *                       user_setting. Not in this config; there is no cap or choice.
 *  3. offers          — keyed by slug, each its own /offer/<slug>. `kind: 'legacy'` is the
 *                       standing legacy-member offer; others are ad-hoc campaigns.
 *
 * getPricing() reads the site_settings row key='pricing' and deep-merges it over DEFAULTS,
 * so a missing or partial row can never throw or blank out a price mid-checkout.
 */

// Current live values — the fallback floor. Seeded into site_settings by
// claudeTools/seedPricing.js so the DB row and this default agree on day one.
export const DEFAULTS = {
    subscribe: {
        amount: 50,
        term: 'monthly',
        trialDays: 7,
        // The $50/mo Price minted 2026-08-13 (applyStandardPrice.js). This is the fallback floor
        // only — the live value lives in site_settings.pricing and admin edits update it there.
        stripePriceId: 'price_1U4951AhvJ5jyCLHR452r5Aa',
    },
    renewNoHistory: {
        amount: 50,
        term: 'monthly',
    },
    offers: {
        legacy15: {
            kind: 'legacy',
            active: true,
            amount: 15,
            term: 'monthly',
            regularRate: 50,
            campaign: 'marketing_drip_legacy15',
            endDate: '2026-09-30',
            headline: 'Welcome Back.',
            headlineAccent: 'Legacy Offer.',
            subheadline: 'A special rate reserved for Legacy Members — {{offerPrice}}/month to rejoin the GymnasticBodies community.',
            ctaLabel: 'Rejoin for {{offerPrice}}/month',
            metaTitle: 'Legacy Member Offer | GymnasticBodies',
        },
    },
};

// Shallow-per-section merge: DB row wins field-by-field, DEFAULTS fills any gap. Offers are
// merged per-slug (a DB offer fully replaces the default of the same slug; default slugs the
// DB omits are still present so legacy never vanishes).
function mergePricing(row) {
    if (!row || typeof row !== 'object') return structuredCloneSafe(DEFAULTS);
    return {
        subscribe: { ...DEFAULTS.subscribe, ...(row.subscribe || {}) },
        renewNoHistory: { ...DEFAULTS.renewNoHistory, ...(row.renewNoHistory || {}) },
        offers: { ...DEFAULTS.offers, ...(row.offers || {}) },
    };
}

function structuredCloneSafe(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Read the full pricing config. Always returns a complete, valid object.
 */
export async function getPricing() {
    try {
        const { pricing } = await getSiteSettings('pricing');
        return mergePricing(pricing);
    } catch {
        // A DB hiccup must never take down checkout or the subscribe page.
        return structuredCloneSafe(DEFAULTS);
    }
}

// ── Convenience readers ────────────────────────────────────────────────────

export async function getSubscribePricing() {
    return (await getPricing()).subscribe;
}

export async function getRenewNoHistoryPricing() {
    return (await getPricing()).renewNoHistory;
}

export async function getOffer(slug) {
    const { offers } = await getPricing();
    return offers?.[slug] || null;
}

export async function getActiveOffers() {
    const { offers } = await getPricing();
    return Object.fromEntries(
        Object.entries(offers || {}).filter(([, o]) => o && o.active !== false)
    );
}

// ── Display / token helpers (pure — safe on client or server) ───────────────

/**
 * Format a defined amount as currency. This is display formatting of a SINGLE stored value,
 * not price math — integers show as "$75", non-integers as "$14.99".
 */
export function formatPrice(amount) {
    const n = Number(amount);
    if (!isFinite(n)) return '';
    return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

/**
 * Substitute {{token}} occurrences in a copy string from a vars map. Unknown tokens are left
 * untouched. Every price-bearing copy field runs through this so no literal $ lives in content.
 *
 *   renderPriceCopy('Rejoin for {{offerPrice}}/month', { offerPrice: '$15' }) -> 'Rejoin for $15/month'
 */
export function renderPriceCopy(str, vars = {}) {
    if (typeof str !== 'string') return str;
    return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, key) =>
        Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : m
    );
}

/**
 * Build the standard token map for an offer's copy fields.
 */
export function offerTokens(offer) {
    if (!offer) return {};
    return {
        offerPrice: formatPrice(offer.amount),
        offerRegularRate: formatPrice(offer.regularRate),
    };
}
