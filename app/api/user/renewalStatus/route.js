import { NextResponse } from 'next/server';
import { getUserWithEmail, queryUserSetting } from '@/lib/userSettings';
import { logger } from '@/lib/logger';

export async function GET(request) {
    const email = new URL(request.url).searchParams.get('email');
    if (!email) return NextResponse.json({ needsRenewal: false });

    try {
        const user = await getUserWithEmail(email);
        if (!user) return NextResponse.json({ needsRenewal: false });

        const needsRenewal = user.migrationType === 'active_expired';

        let price = '75';
        let term = 'monthly';
        let hasValidHistoricalData = false;

        const setting = await queryUserSetting(user.id, 'subscription');
        if (setting?.data) {
            try {
                const data = JSON.parse(setting.data);
                const storedPrice = data.price && data.price !== 'N/A' ? data.price : null;
                const storedTerm  = data.term  && data.term  !== 'N/A' ? data.term  : null;
                if (storedPrice) price = storedPrice;
                if (storedTerm)  term  = storedTerm;
                const parsed = parseFloat(storedPrice);
                hasValidHistoricalData = storedPrice !== null && !isNaN(parsed) && parsed > 0;
            } catch (_) {}
        }

        logger.info('renewalStatus.check', { email, needsRenewal, migrationType: user.migrationType });
        return NextResponse.json({ needsRenewal, price, term, hasValidHistoricalData, name: user.name ?? '' });
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
