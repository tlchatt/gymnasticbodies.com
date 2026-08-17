// Legacy AWS API tombstone + telemetry.
//
// The legacy Spring Boot backend at api.gymnasticbodies.com was retired
// (2026-08-17, prod Fargate scaled to zero). api.gymnasticbodies.com is now
// pointed at this Vercel deployment; next.config.mjs rewrites EVERY request on
// that host to this catch-all. We record exactly who/what is still calling the
// dead API (path, method, user-agent, IP, and — best effort — the caller's email
// decoded from a legacy bearer token) so we can prove the traffic is stale
// caches / bots before deleting the ELB + RDS outright, and so any real straggler
// is identifiable. Every request answers 410 Gone.

import { db } from '@/Drizzle/index.ts';
import { app_logs } from '@/Drizzle/db/schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Decode a JWT payload WITHOUT verifying it — purely to attribute the caller.
// Never throws; returns {} on anything unexpected.
function peekToken(auth) {
    try {
        if (!auth) return {};
        const raw = auth.replace(/^Bearer\s+/i, '').trim();
        const parts = raw.split('.');
        if (parts.length !== 3) return {};
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        const email = payload.email || payload.sub || payload.user_name || null;
        const uid = payload.userId ?? payload.id ?? null;
        return { email: typeof email === 'string' ? email : null, userId: uid != null ? String(uid) : null };
    } catch {
        return {};
    }
}

async function handle(request, ctx) {
    const url = new URL(request.url);
    const params = (await ctx?.params) || {};
    const path = '/' + ((params.path || []).join('/'));
    const auth = request.headers.get('authorization');
    const { email, userId } = peekToken(auth);

    // Awaited insert (not the fire-and-forget logger) so the write survives the
    // function freezing right after we return the response.
    try {
        await db.insert(app_logs).values({
            level: 'info',
            event: 'legacy_api.hit',
            email: email ?? null,
            userId: userId ?? null,
            source: 'api.gymnasticbodies.com',
            data: {
                method: request.method,
                path,
                query: url.search || '',
                ua: request.headers.get('user-agent') || null,
                referer: request.headers.get('referer') || null,
                ip: request.headers.get('x-forwarded-for') || null,
                hasAuth: !!auth,
            },
        });
    } catch {
        // Telemetry must never block the tombstone response.
    }

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
    }
    return new Response(
        JSON.stringify({ error: 'gone', message: 'The legacy GymnasticBodies API has been retired. This service now runs on app.gymnasticbodies.com.' }),
        { status: 410, headers: { 'Content-Type': 'application/json', ...CORS } },
    );
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
