/**
 * /api/admin/pricing — read + update the single pricing config (site_settings key='pricing').
 *
 * GET  -> current merged config (admin only)
 * PUT  -> validate + save a new config (admin only). When the Subscribe amount or term changed,
 *         mint a NEW Stripe Price on the same product and store its id; new signups bill it while
 *         every existing subscriber stays on their old Price (grandfathered). Renew/offer amounts
 *         need no Stripe object — those routes build price_data dynamically.
 */
import { NextResponse } from 'next/server';
import { db } from '@/Drizzle';
import { site_settings } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/adminAuth';
import { getPricing, DEFAULTS } from '@/lib/pricing';
import { createRecurringPrice } from '@/lib/stripeServerFunction';
import { logger } from '@/lib/logger';

function termToInterval(term) {
    const t = (term || '').toLowerCase();
    if (['annually', 'annual', 'yearly', 'year'].includes(t)) return { interval: 'year', intervalCount: 1 };
    if (['quarterly', 'quarter'].includes(t)) return { interval: 'month', intervalCount: 3 };
    return { interval: 'month', intervalCount: 1 };
}

const isPosAmount = v => typeof v === 'number' ? v > 0 : (v != null && v !== '' && !isNaN(parseFloat(v)) && parseFloat(v) > 0);
const num = v => (typeof v === 'number' ? v : parseFloat(v));

export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;
    const pricing = await getPricing();
    return NextResponse.json({ pricing });
}

export async function PUT(request) {
    const { user, error } = await requireAdmin();
    if (error) return error;

    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const incoming = body?.pricing ?? body;
    if (!incoming || typeof incoming !== 'object') return NextResponse.json({ error: 'pricing object required' }, { status: 400 });

    const current = await getPricing();

    // ── Validate ──
    const errors = [];
    const sub = { ...current.subscribe, ...(incoming.subscribe || {}) };
    if (!isPosAmount(sub.amount)) errors.push('subscribe.amount must be a positive number');
    sub.amount = num(sub.amount);

    const renew = { ...current.renewNoHistory, ...(incoming.renewNoHistory || {}) };
    if (!isPosAmount(renew.amount)) errors.push('renewNoHistory.amount must be a positive number');
    renew.amount = num(renew.amount);

    const offers = { ...(incoming.offers || current.offers || {}) };
    for (const [slug, o] of Object.entries(offers)) {
        if (!/^[a-z0-9-]+$/i.test(slug)) errors.push(`offer slug "${slug}" must be alphanumeric/dashes only`);
        if (!isPosAmount(o?.amount)) errors.push(`offer "${slug}".amount must be a positive number`);
        else offers[slug] = { ...o, amount: num(o.amount), regularRate: o.regularRate != null ? num(o.regularRate) : o.regularRate };
    }
    if (errors.length) return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });

    // ── Stripe: mint a new Price if the Subscribe rate changed ──
    let mintedPriceId = null;
    const subChanged = num(current.subscribe.amount) !== sub.amount || (current.subscribe.term || 'monthly') !== (sub.term || 'monthly');
    if (subChanged) {
        try {
            const { interval, intervalCount } = termToInterval(sub.term);
            mintedPriceId = await createRecurringPrice({
                amountCents: Math.round(sub.amount * 100),
                interval,
                intervalCount,
                anchorPriceId: current.subscribe.stripePriceId || DEFAULTS.subscribe.stripePriceId,
                nickname: `Subscribe ${sub.term} $${sub.amount} (set ${user.email})`,
            });
            sub.stripePriceId = mintedPriceId;
        } catch (e) {
            logger.error('admin.pricing_stripe_mint_failed', { email: user.email, error: e });
            return NextResponse.json({ error: 'Could not create the new Stripe Price. Pricing was NOT saved.', detail: e?.message }, { status: 502 });
        }
    } else {
        // amount unchanged — never drop the existing Price id
        sub.stripePriceId = current.subscribe.stripePriceId || DEFAULTS.subscribe.stripePriceId;
    }

    const config = { subscribe: sub, renewNoHistory: renew, offers };

    // ── Save ──
    await db.insert(site_settings)
        .values({ key: 'pricing', value: config, updatedAt: new Date() })
        .onConflictDoUpdate({ target: site_settings.key, set: { value: config, updatedAt: new Date() } });

    logger.info('admin.pricing_update', {
        email: user.email,
        data: {
            subscribeAmount: sub.amount, subscribeChanged: subChanged, mintedPriceId,
            renewNoHistory: renew.amount, offerSlugs: Object.keys(offers),
        },
    });

    return NextResponse.json({ ok: true, pricing: config, mintedPriceId });
}
