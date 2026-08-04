import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Cross-origin logging from my.gymnasticbodies.com — POST responses need the ACAO
// header too, not just the OPTIONS preflight (otherwise the browser blocks the read
// and every page logs a benign-but-noisy CORS console error).
const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-log-token',
};

const ALLOWED_EVENTS = new Set([
    'my.login.attempt',
    'my.login.success',
    'my.login.failed',
    'my.login.renewal_redirect',
    'my.renewal.landed',
    'my.renewal.auth_success',
    'my.renewal.auth_failed',
    // Video playback diagnostics (added 2026-07-24 — legacy/Neon merge video regression).
    // my.video.missing_src is the highest-signal event: a playlist item resolved to an
    // empty Blob src (undefined mediaId), which renders a blank modal with no <video> and
    // no native error — the silent failure users report as "videos won't load".
    'my.video.error',        // <video> element fired onError (media/network/decode/src)
    'my.video.missing_src',  // resolved src was empty — undefined/missing mediaId
    'my.video.stalled',      // <video> onStalled — data fetch stalled ("spinning forever")
    'my.video.loadstart',    // <video> began loading a real src (baseline / success signal)
    // Course / workout data-load diagnostics (content spins, never populates).
    'my.course.error',
    'my.course.empty',
    // Auth events (added 2026-08-04, AWS removal). my.login.success/failed now carry
    // data.rail = 'neon' | 'aws' so the share of members still depending on AWS is
    // measurable — that number is what says when AWS can actually be retired.
    'my.auth.reset_password.success',
    'my.auth.reset_password.failed',   // token rejected, mismatch, or server error
    'my.auth.reset_link.requested',
    'my.auth.reset_link.failed',
    'my.auth.signup.failed',
    'my.auth.session_expired',         // Interceptor saw a 401 with no rail left to retry
]);

export async function POST(request) {
    try {
        const token = request.headers.get('x-log-token');
        if (token !== process.env.CLIENT_LOG_TOKEN) {
            return NextResponse.json({ ok: false }, { status: 401, headers: CORS });
        }

        const { event, level = 'info', ...data } = await request.json();

        if (!ALLOWED_EVENTS.has(event)) {
            return NextResponse.json({ ok: false, reason: 'unknown event' }, { status: 400, headers: CORS });
        }

        logger[level]?.(event, { source: 'my.gymnasticbodies.com', ...data });
    } catch (_) {
        // Never surface logging errors to the caller
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
}

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}
