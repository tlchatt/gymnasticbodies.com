/**
 * /api/admin/impersonate — issue a my.gymnasticbodies.com session for a given email,
 * without that user's password.
 *
 * Serves two callers with one primitive:
 *   1. Support/admin — "show me what this member sees" from the admin UI.
 *   2. Automated + manual testing — assume any test account on either auth rail.
 *
 * AUTHORISATION (one of):
 *   - a better-auth admin session (role='admin'), same as every other /api/admin route
 *   - header `x-impersonation-secret` matching IMPERSONATION_SECRET (server-side env only,
 *     never shipped in a client bundle) — this is the path automation uses
 *
 * The returned token is deliberately NOT signed by AWS. `authCheckState` on my. calls
 * jwt.decode(), which base64-decodes without verifying, so this is sufficient to make the
 * app behave as that user against every Neon route. Anything still authenticated BY AWS
 * will 401 under an impersonated session — which is a useful signal: that screen has not
 * been migrated yet.
 *
 * POST { email }  ->  { session: {...localStorage keys...}, user: {...}, rail }
 * Every issuance is written to app_logs with the actor and the target.
 */
import { neon } from '@neondatabase/serverless';
import { requireAdmin } from '@/lib/adminAuth';
import { logger } from '@/lib/logger';

const sql = neon(process.env.DATABASE_URL);

// The caller sends credentials:'include' so an app. admin session can authorise, and a
// wildcard Allow-Origin is invalid with credentials — the request origin must be echoed
// back. Restricted to the my. hosts so this is not an open credentialed endpoint.
const ALLOWED_ORIGINS = new Set([
    'https://my.gymnasticbodies.com',
    'https://my.gymnasticbodies.dev',
    'https://app.gymnasticbodies.com',
    'https://app.gymnasticbodies.dev',
    'http://localhost:3000',
    'http://localhost:3014',
]);

function corsFor(request) {
    const origin = request.headers.get('origin') || '';
    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://my.gymnasticbodies.com',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-impersonation-secret',
        'Vary': 'Origin',
    };
}

const json = (data, status, request) =>
    new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...corsFor(request) },
    });

export async function OPTIONS(request) { return new Response(null, { status: 204, headers: corsFor(request) }); }

const b64url = obj => Buffer.from(JSON.stringify(obj)).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

// Structurally valid JWT carrying the AWS integer id in `cid`, which is the only field
// authCheckState reads off the token.
function buildToken({ awsId, email, name, tz }) {
    const now = Math.floor(Date.now() / 1000);
    return [
        b64url({ alg: 'HS512' }),
        b64url({
            fname: (name || 'Member').split(' ')[0],
            sub: email,
            lname: '',
            tz,
            tagids: [102, 122, 224, 226, 228, 330, 446, 612, 616, 620, 632, 698, 788, 1036, 1301],
            exp: now + 60 * 60 * 24 * 30,
            iat: now,
            cid: awsId,
        }),
        'impersonation-not-an-aws-signature',
    ].join('.');
}

export async function POST(request) {
    try {
        const secret = process.env.IMPERSONATION_SECRET;
        const provided = request.headers.get('x-impersonation-secret');

        let actor = null;
        if (secret && provided && provided === secret) {
            actor = 'secret';
        } else {
            const { user, error } = await requireAdmin();
            if (error) return json({ error: 'Forbidden — admin session or x-impersonation-secret required' }, 403, request);
            actor = user.email || user.id;
        }

        const body = await request.json().catch(() => ({}));
        const email = String(body.email || '').trim().toLowerCase();
        if (!email) return json({ error: 'email required' }, 400, request);

        const rows = await sql`
            SELECT u.id, u.email, u.name, u.migration_type, u.customer_segment,
                   us.aws_customer_id AS aws_id
            FROM "user" u
            LEFT JOIN user_setting us ON us.user_id = u.id AND us.type = 'subscription'
            WHERE lower(u.email) = ${email}
            LIMIT 1`;
        if (!rows.length) return json({ error: `no such user: ${email}` }, 404, request);
        const u = rows[0];

        const awsId = /^\d+$/.test(String(u.aws_id || '')) ? Number(u.aws_id) : null;
        // Callers may force a rail; otherwise a numeric aws_customer_id means legacy.
        const rail = body.rail || (awsId ? 'legacy' : 'neon');
        if (rail === 'legacy' && !awsId) {
            return json({ error: `${email} has no numeric aws_customer_id — cannot assume the legacy rail` }, 400, request);
        }

        // Some legacy rows carry a literal "N/A" name — fall back to the email local part
        // so the app greets something sensible rather than "Hi N/A".
        const rawName = (u.name || '').trim();
        const displayName = (!rawName || rawName.toUpperCase() === 'N/A')
            ? (u.email.split('@')[0] || 'Member')
            : rawName;

        const tz = body.timezone || 'America/New_York';
        const token = buildToken({ awsId: awsId || 0, email: u.email, name: displayName, tz });
        const expiry = new Date(Date.now() + 30 * 86400000).toString();

        const session = {
            authToken: token,
            refreshToken: token,
            userId: rail === 'legacy' ? String(awsId) : u.id,
            neonUserId: u.id,
            username: u.email,
            name: displayName.split(' ')[0],
            postAWS: rail === 'legacy' ? 'false' : 'true',
            timezone: tz,
            AuthExpirationDate: expiry,
            refreshExpireTime: expiry,
        };

        logger.info('admin.impersonate', {
            email: u.email, userId: u.id,
            data: { actor, rail, awsUserId: awsId },
        });

        return json({
            session, rail,
            user: {
                id: u.id, email: u.email, name: u.name,
                awsUserId: awsId, migrationType: u.migration_type, customerSegment: u.customer_segment,
            },
        }, 200, request);
    } catch (error) {
        console.log('impersonate error:', error);
        return json({ error: error.message }, 400, request);
    }
}
