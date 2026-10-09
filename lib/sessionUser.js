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

// Bearer token from the request, or null. A signed-cookie style "token.signature" is cut
// to the token part, matching how better-auth stores it.
export function bearerToken(request) {
    const header = request.headers.get('authorization') || '';
    const token = header.replace(/^Bearer\s+/i, '').split('.')[0].trim();
    if (!token || token === 'undefined' || token === 'null') return null;
    return token;
}

// userId of the live session the request's bearer token belongs to, or null.
export async function getSessionUserId(request) {
    const token = bearerToken(request);
    if (!token) return null;
    const rows = await db.select({ userId: session.userId }).from(session)
        .where(and(eq(session.token, token), gt(session.expiresAt, new Date())))
        .limit(1);
    return rows[0]?.userId ?? null;
}
