import PricingClient from './PricingClient';
import { getPricing } from '@/lib/pricing';

export const metadata = { title: 'Pricing | Admin' };

export default async function PricingPage() {
    const pricing = await getPricing();
    return <PricingClient initial={pricing} />;
}
