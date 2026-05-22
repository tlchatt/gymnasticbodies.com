import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const ALLOWED_EVENTS = new Set([
    'my.login.attempt',
    'my.login.success',
    'my.login.failed',
    'my.login.renewal_redirect',
    'my.renewal.landed',
    'my.renewal.auth_success',
    'my.renewal.auth_failed',
]);

export async function POST(request) {
    try {
        const token = request.headers.get('x-log-token');
        if (token !== process.env.CLIENT_LOG_TOKEN) {
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        const { event, level = 'info', ...data } = await request.json();

        if (!ALLOWED_EVENTS.has(event)) {
            return NextResponse.json({ ok: false, reason: 'unknown event' }, { status: 400 });
        }

        logger[level]?.(event, { source: 'my.gymnasticbodies.com', ...data });
    } catch (_) {
        // Never surface logging errors to the caller
    }

    return NextResponse.json({ ok: true });
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-log-token',
        },
    });
}
