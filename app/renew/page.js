import { redirect } from 'next/navigation';
import RenewClient from './RenewClient';
import content from '@/data/content/renew.json';
import { getUserWithEmail, queryUserSetting } from '@/lib/userSettings';
import { getOffer } from '@/lib/pricing';

export const metadata = {
    title: content.meta.title,
    description: content.meta.description,
    robots: { index: false, follow: false },
};

// Members flagged with data.renewOffer (a specific group, e.g. the Sep 2026 offer-checkout-crash
// victims promised they can keep $15) renew through that offer's page instead of /renew.
// Only the flag sends someone there — offer eligibility alone does not.
async function flaggedOfferSlug(email) {
    if (!email) return null;
    const user = await getUserWithEmail(email);
    if (!user) return null;
    const setting = await queryUserSetting(user.id, 'subscription');
    let data = {};
    try { data = JSON.parse(setting?.data ?? '{}'); } catch {}
    const slug = data.renewOffer;
    if (!slug) return null;
    const offer = await getOffer(slug);
    return offer && offer.active !== false ? slug : null;
}

export default async function RenewPage({ searchParams }) {
    const email = (await searchParams)?.email?.trim().toLowerCase();
    const slug = await flaggedOfferSlug(email);
    if (slug) redirect(`/offer/${slug}?email=${encodeURIComponent(email)}`);
    return <RenewClient />;
}
