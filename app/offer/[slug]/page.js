import { notFound } from 'next/navigation';
import OfferClient from './OfferClient';
import { getOffer, offerTokens, renderPriceCopy, formatPrice } from '@/lib/pricing';

// Resolve an offer from the pricing config and substitute every {{token}} in its copy so no
// literal price ever reaches the client. `price`/`priceDisplay` are provided for the portal.
async function resolveOffer(slug) {
  const raw = await getOffer(slug);
  if (!raw || raw.active === false) return null;
  const tokens = offerTokens(raw);
  return {
    ...raw,
    price: raw.amount,
    priceDisplay: formatPrice(raw.amount),
    regularRateDisplay: formatPrice(raw.regularRate),
    headline: renderPriceCopy(raw.headline, tokens),
    headlineAccent: renderPriceCopy(raw.headlineAccent, tokens),
    subheadline: renderPriceCopy(raw.subheadline, tokens),
    ctaLabel: renderPriceCopy(raw.ctaLabel, tokens),
  };
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const offer = await resolveOffer(slug);
  if (!offer) return {};
  return {
    title: renderPriceCopy(offer.metaTitle, offerTokens(offer)),
    robots: { index: false, follow: false },
  };
}

export default async function OfferPage({ params }) {
  const { slug } = await params;
  const offer = await resolveOffer(slug);
  if (!offer) notFound();
  return <OfferClient slug={slug} offer={offer} />;
}
