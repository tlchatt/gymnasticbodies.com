import { NextResponse } from 'next/server';
import { getUserWithEmail, queryUserSetting } from '@/lib/userSettings';
import { logger } from '@/lib/logger';

function normalizeTerm(t) {
    const v = t?.toLowerCase();
    if (v === 'annually' || v === 'annual' || v === 'yearly' || v === 'year') return 'annually';
    if (v === 'quarterly' || v === 'quarter') return 'quarterly';
    return 'monthly';
}

export async function GET(request) {
    const email = new URL(request.url).searchParams.get('email');
    if (!email) return NextResponse.json({ needsRenewal: false });

    try {
        const user = await getUserWithEmail(email);
        if (!user) return NextResponse.json({ needsRenewal: false });

        const needsRenewal = user.migrationType === 'noncurrent';

        let price = '75';
        let term = 'monthly';
        let hasValidHistoricalData = false;

        const setting = await queryUserSetting(user.id, 'subscription');

        // Legacy members authenticated against AWS until 2026-08-04, and the AWS sign-in
        // path never performed this check — only the Neon fallback did. Making Neon the
        // only rail therefore exposed the paywall to a cohort that had never met it, and
        // long-standing/lifetime members were bounced to /renew on login within hours.
        // Reporting the AWS identity lets the client preserve the behaviour each cohort
        // actually had. This does NOT change needsRenewal itself, so /renew and every
        // other caller are unaffected.
        const hasAwsIdentity = /^\d+$/.test(String(setting?.awsCustomerId ?? '').trim());

        if (setting?.data) {
            try {
                const data = JSON.parse(setting.data);
                const storedPrice = data.price && data.price !== 'N/A' ? data.price : null;
                const storedTerm  = data.term  && data.term  !== 'N/A' ? data.term  : null;
                if (storedPrice) price = storedPrice;
                if (storedTerm)  term  = normalizeTerm(storedTerm);
                const parsed = parseFloat(storedPrice);
                hasValidHistoricalData = storedPrice !== null && !isNaN(parsed) && parsed > 0;
            } catch (_) {}
        }

        logger.info('renewalStatus.check', {
            email, needsRenewal, migrationType: user.migrationType,
            data: { hasAwsIdentity },
        });
        return NextResponse.json({
            needsRenewal, price, term, hasValidHistoricalData,
            name: user.name ?? '', hasAwsIdentity,
        });
    } catch (err) {
        logger.error('renewalStatus.error', { email, error: err });
        return NextResponse.json({ needsRenewal: false });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
