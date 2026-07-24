import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { db } from '@/Drizzle/index.ts';
import { user, user_setting } from '@/Drizzle/db/schema';
import { and, eq, ilike, or, desc } from 'drizzle-orm';
import { subscriptionStatusLabel } from '@/lib/subscription';

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const sp = new URL(request.url).searchParams;
  const q         = sp.get('q')?.trim()         ?? '';
  const migration = sp.get('migration')?.trim()  ?? '';
  const segment   = sp.get('segment')?.trim()    ?? '';

  const conditions = [];
  if (q)         conditions.push(or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`)));
  if (migration) conditions.push(eq(user.migrationType, migration));
  if (segment)   conditions.push(eq(user.customerSegment, segment));

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      migrationType: user.migrationType,
      customerSegment: user.customerSegment,
      createdAt: user.createdAt,
      settingId: user_setting.id,
      settingData: user_setting.data,
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
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(200);

  // Deduplicate in case a user has multiple subscription settings
  const seen = new Set();
  const users = rows
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map((r) => {
      const { settingId, settingData, ...rest } = r;
      // Derive Active/Expired from the expiration date in user_setting.data
      // (JSON TEXT column — JSON.parse it, never ->>), NOT the raw
      // user_setting.status string, which is set unreliably by imports/grants.
      // No live Stripe call in the list: the classifier self-heals Stripe users'
      // renewaldate, so the future-date test is sufficient here. Users with no
      // subscription setting row keep the '—' (null) display.
      let settingStatus = null;
      if (settingId != null) {
        let renewaldate = null;
        try {
          const parsed = typeof settingData === 'string' ? JSON.parse(settingData || '{}') : (settingData ?? {});
          renewaldate = parsed?.renewaldate ?? parsed?.nextPaymentDate ?? null;
        } catch { renewaldate = null; }
        settingStatus = subscriptionStatusLabel({ renewaldate });
      }
      return { ...rest, settingStatus };
    });

  return NextResponse.json({ users, total: users.length });
}
