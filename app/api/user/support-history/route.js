import { NextResponse } from 'next/server';
import { fetchUserSupportHistory } from '@/lib/userHelpers';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        if (!userId) return NextResponse.json([], { headers: CORS });
        const history = await fetchUserSupportHistory(userId);
        return NextResponse.json(history, { headers: CORS });
    } catch {
        return NextResponse.json([], { status: 500, headers: CORS });
    }
}
