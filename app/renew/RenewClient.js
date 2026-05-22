'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import dynamic from 'next/dynamic';
import DarkNav from '@/components/DarkNav';
import { barlow, dm } from '@/lib/fonts';
import s from './renew.module.css';

const RenewalPortal = dynamic(() => import('@/components/RenewalPortal'), { ssr: false });

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function RenewInner({ onNameLoaded }) {
    const searchParams = useSearchParams();
    const email = searchParams.get('email') ?? '';
    return <RenewalPortal email={email} onNameLoaded={onNameLoaded} />;
}

export default function RenewClient() {
    const [userName, setUserName] = useState('');

    return (
        <div className={`${s.page} ${barlow.variable} ${dm.variable}`}>
            <DarkNav userDisplay={userName} />
            <Elements stripe={stripePromise}>
                <Suspense>
                    <RenewInner onNameLoaded={setUserName} />
                </Suspense>
            </Elements>
        </div>
    );
}
