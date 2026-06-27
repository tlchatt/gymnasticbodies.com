import { NextResponse } from 'next/server';
import { db } from '@/Drizzle/index.ts';
import { outbound_emails, user } from '@/Drizzle/db/schema';
import { eq, and } from 'drizzle-orm';
import offers from '@/data/content/offers.json';
import { logger } from '@/lib/logger';

export async function GET(request, { params }) {
  const { slug } = await params;
  const offer = offers[slug];
  if (!offer) {
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

  const [row] = await db
    .select({ id: outbound_emails.id })
    .from(outbound_emails)
    .where(and(
      eq(outbound_emails.toEmail, email),
      eq(outbound_emails.campaign, offer.campaign)
    ))
    .limit(1);

  if (!row) {
    logger.info('offer.eligibility_check', { email, slug, eligible: false, reason: 'not_found' });
    return NextResponse.json({ eligible: false, reason: 'not_found' });
  }

  logger.info('offer.eligibility_check', { email, slug, eligible: true });
  return NextResponse.json({ eligible: true, offer });
}
