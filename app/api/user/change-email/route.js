import { NextResponse } from 'next/server';
import { db } from '@/Drizzle/index.ts';
import { user, user_setting, verification } from '@/Drizzle/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { sendEmailChangeSG } from '@/lib/sendgrid';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: CORS });
}

export async function PUT(request) {
    try {
        const { userId, newEmail } = await request.json();
        if (!userId || !newEmail?.includes('@')) {
            return NextResponse.json({ success: false, message: 'userId and valid newEmail required.' }, { status: 400, headers: CORS });
        }

        const normalizedEmail = newEmail.trim().toLowerCase();

        // Check the new email isn't already taken
        const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, normalizedEmail)).limit(1);
        if (existing) {
            return NextResponse.json({ success: false, message: 'That email address is already in use.' }, { status: 409, headers: CORS });
        }

        // Store a verification token: identifier = change-email:{userId}, value = newEmail
        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const identifier = `change-email:${userId}`;

        // Delete any previous pending change for this user
        await db.delete(verification).where(eq(verification.identifier, identifier));

        await db.insert(verification).values({
            id: token,
            identifier,
            value: normalizedEmail,
            expiresAt,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const appUrl = process.env.BETTER_AUTH_URL ?? 'https://app.gymnasticbodies.com';
        const verificationLink = `${appUrl}/api/user/verify-email?token=${token}&userId=${encodeURIComponent(userId)}`;

        const sent = await sendEmailChangeSG(normalizedEmail, verificationLink);
        if (!sent) {
            return NextResponse.json({ success: false, message: 'Failed to send verification email. Please try again.' }, { status: 500, headers: CORS });
        }

        return NextResponse.json({ success: true }, { headers: CORS });
    } catch (error) {
        return NextResponse.json({ success: false, message: error?.message ?? 'Request failed.' }, { status: 500, headers: CORS });
    }
}
