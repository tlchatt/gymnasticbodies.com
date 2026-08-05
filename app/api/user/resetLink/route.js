import { verification } from "@/Drizzle/db/schema"
import { db } from "@/Drizzle/index.ts";
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendResetLinkEmailSG } from "@/lib/sendgrid";
import { getUserWithEmail } from "@/lib/userSettings";
import { logger } from "@/lib/logger";

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function POST(request) {

    //cmd for curl request to test this endpoint:
    /*curl -X POST \  http://localhost:3001/api/user/resetLink \  -H 'Content-Type: application/json' \  -d '{"email": "pc@tlchatt.com"}'*/

    const json = await request.json()

    json.email = json.email.toLowerCase()

    const dbUser = await getUserWithEmail(json.email)

    // Any user with a Neon row can reset. This used to be gated on postAWS !== false,
    // which blocked the entire imported legacy population (WooCommerce/Auth.net) — and
    // since the AWS cutover this flow is the ONLY account recovery path, including for
    // the ~300 members who never had a credential migrated.
    if (!dbUser?.id) {
        logger.warn('auth.reset_link.unknown_email', { email: json.email })
        return new Response(`New user in password reset, not present in the neon DB`, {
            status: 400,
            headers: CORS,
        })
    }

    // Single-use token, validated by /api/user/resetPassword. Same pattern as change-email.
    const token = randomBytes(32).toString('hex');
    const identifier = `reset-password:${dbUser.id}`;

    try {
        await db.delete(verification).where(eq(verification.identifier, identifier));
        await db.insert(verification).values({
            id: token,
            identifier,
            value: token,
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        await sendResetLinkEmailSG({
            email: json.email,
            userId: dbUser.id,
            token,
        })
        logger.info('auth.reset_link.sent', { email: json.email, userId: dbUser.id })
        return new Response('OK', { status: 200, headers: CORS });
    } catch (err) {
        logger.error('auth.reset_link.error', { email: json.email, userId: dbUser.id, error: err?.message })
        return new Response(`Password Reset Failed, Email not sent.`, {
            status: 400,
            headers: CORS,
        })
    }
}
// GET just to return 200 status for preflight to work
export async function GET() {
    return new Response('Success!', {
        status: 200,
        headers: CORS,
    })
}
