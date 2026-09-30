import { db } from "@/Drizzle/index.ts";
import { verification } from "@/Drizzle/db/schema";
import { and, eq, lt } from 'drizzle-orm';
import { randomBytes } from 'crypto';

// Password-reset links. Each link is its own verification row (id = token).
//
// Why several can be live at once: members routinely press "Change Password" twice a few
// seconds apart (the form re-enables after 4s with no "email sent" state), or ask again
// when the first email is slow. This used to delete the previous token on every request,
// so the FIRST email — which mail clients thread on top and members open first — was dead
// on arrival. That was the bulk of `auth.reset_password.invalid_token` (Sep 2026).
//
// Used links are kept (under a separate identifier) until they expire so a second submit
// of an already-used link can be told apart from a bad/expired one.

export const RESET_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const liveId = (userId) => `reset-password:${userId}`;
const usedId = (userId) => `reset-password-used:${userId}`;

export async function mintResetToken(userId) {
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    // Housekeeping only — never touches a link that could still work.
    await db.delete(verification).where(and(eq(verification.identifier, liveId(userId)), lt(verification.expiresAt, now)));
    await db.delete(verification).where(and(eq(verification.identifier, usedId(userId)), lt(verification.expiresAt, now)));
    await db.insert(verification).values({
        id: token,
        identifier: liveId(userId),
        value: token,
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
        createdAt: now,
        updatedAt: now,
    });
    return token;
}

// Returns { ok: true } or { ok: false, reason } where reason is one of
// missing_token | not_found | wrong_user | expired | already_used.
export async function checkResetToken(userId, token) {
    if (!token || token === 'none') return { ok: false, reason: 'missing_token' };
    const rows = await db.select().from(verification).where(eq(verification.id, String(token)));
    const record = rows[0];
    if (!record) return { ok: false, reason: 'not_found' };
    if (record.identifier === usedId(userId)) return { ok: false, reason: 'already_used' };
    if (record.identifier !== liveId(userId) || record.value !== token) return { ok: false, reason: 'wrong_user' };
    if (new Date(record.expiresAt) < new Date()) return { ok: false, reason: 'expired' };
    return { ok: true };
}

// After a successful reset: this link becomes "used", every other outstanding link for the
// member is revoked (a password change should kill older links).
export async function consumeResetToken(userId, token) {
    await db.update(verification)
        .set({ identifier: usedId(userId), updatedAt: new Date() })
        .where(eq(verification.id, String(token)));
    await db.delete(verification).where(eq(verification.identifier, liveId(userId)));
}
