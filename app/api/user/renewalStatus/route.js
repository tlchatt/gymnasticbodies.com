import { NextResponse } from 'next/server';
import { getUserWithEmail, queryUserSetting } from '@/lib/userSettings';

export async function GET(request) {
    const email = new URL(request.url).searchParams.get('email');
    if (!email) return NextResponse.json({ needsRenewal: false });

    try {
        const user = await getUserWithEmail(email);
        if (!user) return NextResponse.json({ needsRenewal: false });

        const needsRenewal = user.migrationType === 'active_expired';

        let price = '75';
        let term = 'monthly';

        const setting = await queryUserSetting(user.id, 'subscription');
        if (setting?.data) {
            try {
                const data = JSON.parse(setting.data);
                if (data.price && data.price !== 'N/A') price = data.price;
                if (data.term && data.term !== 'N/A') term = data.term;
            } catch (_) {}
        }

        return NextResponse.json({ needsRenewal, price, term });
    } catch (err) {
        console.error('renewalStatus error:', err);
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
