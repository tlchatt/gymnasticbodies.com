import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const ALLOWED_EVENTS = new Set([
    'renew.page_view',
    'renew.form_submit',
    'renew.card_error',
    'subscribe.page_view',
]);

export async function POST(request) {
    try {
        const { event, level = 'info', ...data } = await request.json();
        if (!ALLOWED_EVENTS.has(event)) {
            return NextResponse.json({ ok: false, reason: 'unknown event' }, { status: 400 });
        }
        logger[level]?.(event, { source: 'app.gymnasticbodies.com', ...data });
    } catch (_) {}

    return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
