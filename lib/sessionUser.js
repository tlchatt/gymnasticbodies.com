/**
 * lib/sessionUser.js — who is signed in, from the member's session token.
 *
 * my. signs members in through /api/authentication, which creates a better-auth `session`
 * row; the token my. keeps as localStorage `authToken` is that row's token. Member-facing
 * routes send it as "Authorization: Bearer <token>". A live (unexpired) session names its
 * owner — that, not a userId in the request body, is who the caller is.
 *
 * Locally built tokens (testSession.js, /api/admin/impersonate, pre-cutover AWS JWTs) have
 * no session row and resolve to null.
 */
import { db } from "@/Drizzle/index.ts";
import { session } from "@/Drizzle/db/schema";
import { eq, and, gt } from 'drizzle-orm';

// A signed-cookie style "token.signature" is cut to the token part, matching how
// better-auth stores it.
function cleanToken(raw) {
    const token = String(raw ?? '').split('.')[0].trim();
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
}

// Bearer token from the request, or null.
export function bearerToken(request) {
    const header = request.headers.get('authorization') || '';
    return cleanToken(header.replace(/^Bearer\s+/i, ''));
}

// userId of the live session the request's bearer token belongs to, or null.
export async function getSessionUserId(request) {
    return getUserIdForToken(bearerToken(request));
}

// userId of the live session a raw token belongs to, or null. For pages that receive the
// token in the URL (/accountDetails?token=…) rather than a header.
export async function getUserIdForToken(rawToken) {
    const token = cleanToken(rawToken);
    if (!token) return null;
    const rows = await db.select({ userId: session.userId }).from(session)
        .where(and(eq(session.token, token), gt(session.expiresAt, new Date())))
        .limit(1);
    return rows[0]?.userId ?? null;
}

// The 401 every member route returns when there is no live session. CORS headers are
// included so my. (another origin) can read the status — its interceptor signs the member
// out on a 401.
export function unauthorized(message = 'Your sign-in has expired. Please sign in again.') {
    return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
