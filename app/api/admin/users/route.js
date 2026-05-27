import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { user, user_setting } from '@/Drizzle/db/schema';
import { and, eq, ilike, or, desc } from 'drizzle-orm';

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      migrationType: user.migrationType,
      createdAt: user.createdAt,
      settingStatus: user_setting.status,
      stripeCustomerId: user_setting.stripeCustomerId,
      stripeSubscriptionId: user_setting.stripeSubscriptionId,
      trial: user_setting.trial,
      trialEndDate: user_setting.trialEndDate,
    })
    .from(user)
    .leftJoin(
      user_setting,
      and(eq(user_setting.userId, user.id), eq(user_setting.type, 'subscription'))
    )
    .where(q ? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`)) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(200);

  // Deduplicate in case a user has multiple subscription settings
  const seen = new Set();
  const users = rows.filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  return NextResponse.json({ users, total: users.length });
}
