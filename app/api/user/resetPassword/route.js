import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { account } from "@/Drizzle/db/schema"
import { and, eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkResetToken, consumeResetToken } from "@/lib/resetToken";
import { logger } from "@/lib/logger";

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Access-Control-Allow-Origin',
}

const fail = (error, status = 400) =>
    new Response(JSON.stringify({ error }), {
        status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
    })

export async function POST(request) {

    const json = await request.json()

    if (!json.userId || !json.confirmPassword || json.password !== json.confirmPassword) {
        return fail('invalid_request')
    }

    // The link token from /api/user/resetLink is single-use and expires (lib/resetToken.js).
    // Without this check, anyone who knew a userId could take over the account.
    const check = await checkResetToken(json.userId, json.token)

    if (!check.ok) {
        // A second submit of a link that already worked (double-click, or the member coming
        // back to the tab) with the same password is not a failure — the password is set.
        if (check.reason === 'already_used') {
            const cred = await db.select().from(account)
                .where(and(eq(account.userId, json.userId), eq(account.providerId, 'credential')))
            const same = cred[0]?.password
                ? await verifyPassword({ password: json.confirmPassword, hash: cred[0].password }).catch(() => false)
                : false
            if (same) {
                logger.info('auth.reset_password.repeat_submit', { userId: json.userId })
                return new Response('OK', { status: 200, headers: CORS });
            }
        }
        logger.warn('auth.reset_password.invalid_token', { userId: json.userId, reason: check.reason })
        return fail(check.reason === 'already_used' ? 'token_already_used' : 'invalid_or_expired_token')
    }

    const password = await hashPassword(json.confirmPassword)

    let updateQuery = await db.update(account)
        .set(
            {
                password: password,
            }
        ).where(and(eq(account.userId, json.userId), eq(account.providerId, 'credential'))).returning();

    // ~300 imported members have no credential row at all (the password migration was
    // insert-only and no source had a password for them). Reset is their only way in,
    // so create the row. better-auth expects accountId === userId for credential rows,
    // and updatedAt has no DB default.
    let created = false
    if (updateQuery.length === 0) {
        await db.insert(account).values({
            id: randomBytes(16).toString('hex'),
            accountId: json.userId,
            providerId: 'credential',
            userId: json.userId,
            password: password,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        created = true
    }

    await consumeResetToken(json.userId, json.token);

    logger.info('auth.reset_password.success', { userId: json.userId, createdCredential: created })
    return new Response('OK', { status: 200, headers: CORS });
}
// GET just to return 200 status for preflight to work
export async function GET() {
    return new Response('Success!', {
        status: 200,
        headers: CORS,
    })
}
