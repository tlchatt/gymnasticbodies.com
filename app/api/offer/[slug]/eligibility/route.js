import { NextResponse } from 'next/server';
import { db } from '@/Drizzle/index.ts';
import { outbound_emails, user } from '@/Drizzle/db/schema';
import { eq, and, or, like } from 'drizzle-orm';
import { getOffer } from '@/lib/pricing';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  const { slug } = await params;
  const offer = await getOffer(slug);
  if (!offer || offer.active === false) {
    return NextResponse.json({ eligible: false, reason: 'not_found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email')?.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return NextResponse.json({ eligible: false, reason: 'invalid_email' }, { status: 400 });
  }

  const [u] = await db
    .select({ migrationType: user.migrationType })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (u?.migrationType === 'current') {
    logger.info('offer.eligibility_check', { email, slug, eligible: false, reason: 'already_subscribed' });
    return NextResponse.json({ eligible: false, reason: 'already_subscribed' });
  }

  // The legacy offer is sent under several campaign tags (the drip was split into
  // legacy_lockin_*_engaged / _cold, and older sends used marketing_drip_legacy15).
  // Match the whole family so any recipient is eligible — not just the one tag in
  // the pricing config. Other offers keep the exact-campaign match.
  const campaignMatch = slug === 'legacy15'
    ? or(
        like(outbound_emails.campaign, 'marketing_drip_legacy15%'),
        like(outbound_emails.campaign, 'legacy_lockin_%')
      )
    : eq(outbound_emails.campaign, offer.campaign);

  const [row] = await db
    .select({ id: outbound_emails.id })
    .from(outbound_emails)
    .where(and(eq(outbound_emails.toEmail, email), campaignMatch))
    .limit(1);

  if (!row) {
    logger.info('offer.eligibility_check', { email, slug, eligible: false, reason: 'not_found' });
    return NextResponse.json({ eligible: false, reason: 'not_found' });
  }

  logger.info('offer.eligibility_check', { email, slug, eligible: true });
  return NextResponse.json({ eligible: true, offer });
}
