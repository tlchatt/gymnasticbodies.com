'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';
import RenewalPortal from '@/components/RenewalPortal';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function RenewPage() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') ?? '';

    return (
        <Elements stripe={stripePromise}>
            <RenewalPortal email={email} />
        </Elements>
    );
}
