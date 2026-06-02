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
    const token = searchParams.get('token') ?? '';
    const userId = searchParams.get('userId') ?? '';
    return <RenewalPortal email={email} token={token} userId={userId} onNameLoaded={onNameLoaded} />;
}

export default function RenewClient() {
    const [userName, setUserName] = useState('');
    const [accountHref, setAccountHref] = useState('');

    return (
        <div className={`${s.page} ${barlow.variable} ${dm.variable}`}>
            <DarkNav userDisplay={userName} accountHref={accountHref} />
            <Elements stripe={stripePromise}>
                <Suspense>
                    <RenewInner onNameLoaded={(name, token, userId) => {
                        setUserName(name);
                        if (token && userId) {
                            setAccountHref(`/accountDetails?token=${encodeURIComponent(token)}&userId=${encodeURIComponent(userId)}`);
                        }
                    }} />
                </Suspense>
            </Elements>
        </div>
    );
}
