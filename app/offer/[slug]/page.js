import { notFound } from 'next/navigation';
import OfferClient from './OfferClient';
import offers from '@/data/content/offers.json';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const offer = offers[slug];
  if (!offer) return {};
  return {
    title: offer.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function OfferPage({ params }) {
  const { slug } = await params;
  const offer = offers[slug];
  if (!offer) notFound();
  return <OfferClient slug={slug} offer={offer} />;
}
