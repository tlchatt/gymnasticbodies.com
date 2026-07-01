import { NextResponse } from 'next/server';
import { db } from '@/Drizzle/index.ts';
import { user, user_setting } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { queryUserSetting } from '@/lib/userSettings';

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
        const { userId, name, phone, country } = await request.json();
        if (!userId) {
            return NextResponse.json({ success: false, message: 'userId required.' }, { status: 400, headers: CORS });
        }

        // Update display name on the user record
        if (name?.trim()) {
            await db.update(user).set({ name: name.trim() }).where(eq(user.id, userId));
        }

        // Merge phone and country into the user_setting.data JSON blob
        if (phone !== undefined || country !== undefined) {
            const setting = await queryUserSetting(userId, 'subscription');
            if (setting) {
                const currentData = JSON.parse(setting.data ?? '{}');
                const updatedData = {
                    ...currentData,
                    ...(phone !== undefined ? { phone } : {}),
                    ...(country !== undefined ? { country } : {}),
                };
                await db.update(user_setting)
                    .set({ data: JSON.stringify(updatedData) })
                    .where(eq(user_setting.id, setting.id));
            }
        }

        return NextResponse.json({ success: true }, { headers: CORS });
    } catch (error) {
        return NextResponse.json({ success: false, message: error?.message ?? 'Update failed.' }, { status: 500, headers: CORS });
    }
}
