import { db } from '@/Drizzle/index.ts';
import { user, user_setting, verification } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const appUrl = process.env.BETTER_AUTH_URL ?? 'https://app.gymnasticbodies.com';

    const fail = (reason) =>
        Response.redirect(`${appUrl}/accountDetails?userId=${encodeURIComponent(userId ?? '')}&emailError=${encodeURIComponent(reason)}`);

    if (!token || !userId) return fail('invalid_link');

    try {
        const identifier = `change-email:${userId}`;
        const [record] = await db
            .select()
            .from(verification)
            .where(eq(verification.id, token))
            .limit(1);

        if (!record || record.identifier !== identifier) return fail('invalid_link');
        if (record.expiresAt < new Date()) return fail('link_expired');

        const newEmail = record.value;

        // Update user email
        await db.update(user).set({ email: newEmail }).where(eq(user.id, userId));

        // Update email in user_setting.data JSON if present
        const [setting] = await db.select().from(user_setting).where(eq(user_setting.userId, userId)).limit(1);
        if (setting) {
            const data = JSON.parse(setting.data ?? '{}');
            await db.update(user_setting)
                .set({ data: JSON.stringify({ ...data, email: newEmail }) })
                .where(eq(user_setting.id, setting.id));
        }

        // Clean up verification record
        await db.delete(verification).where(eq(verification.id, token));

        return Response.redirect(`${appUrl}/accountDetails?userId=${encodeURIComponent(userId)}&emailChanged=1`);
    } catch {
        return fail('server_error');
    }
}
