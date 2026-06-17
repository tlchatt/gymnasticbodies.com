import { notFound } from 'next/navigation';
import OfferClient from './OfferClient';
import offers from '@/data/content/offers.json';

export function generateMetadata({ params }) {
  const offer = offers[params.slug];
  if (!offer) return {};
  return {
    title: offer.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default function OfferPage({ params }) {
  const offer = offers[params.slug];
  if (!offer) notFound();
  return <OfferClient slug={params.slug} offer={offer} />;
}
