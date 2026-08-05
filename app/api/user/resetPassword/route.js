import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { account, verification } from "@/Drizzle/db/schema"
import { and, eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { hashPassword } from "@/lib/password";
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

    // The link token from /api/user/resetLink is single-use and expires after an hour.
    // Without this check, anyone who knew a userId could take over the account.
    const identifier = `reset-password:${json.userId}`;
    const rows = await db.select().from(verification).where(eq(verification.identifier, identifier));
    const record = rows[0];

    if (!record || record.value !== json.token || new Date(record.expiresAt) < new Date()) {
        logger.warn('auth.reset_password.invalid_token', { userId: json.userId })
        return fail('invalid_or_expired_token')
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

    await db.delete(verification).where(eq(verification.identifier, identifier));

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
