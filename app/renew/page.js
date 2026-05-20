'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import RenewalPortal from '@/components/RenewalPortal';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function RenewInner() {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') ?? '';
    return <RenewalPortal email={email} />;
}

export default function RenewPage() {
    return (
        <Elements stripe={stripePromise}>
            <Suspense>
                <RenewInner />
            </Suspense>
        </Elements>
    );
}
