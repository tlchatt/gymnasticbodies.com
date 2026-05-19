'use client';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import Button from '@mui/material/Button';
import { useSearchParams } from 'next/navigation';
import { useState } from "react";
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import CircularIndeterminate from '@/components/CircularLoading';
import { storeInLocalStorage } from "@/lib/commonFunctions";

export function PaymentPortal(props) {
    const stripe = useStripe();
    const elements = useElements();
    const router = useRouter();
    const searchParams = useSearchParams();

    const amount = searchParams.get('amount');
    const term = searchParams.get('term');
    const trial = searchParams.get('trial');

    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async () => {
        if (!stripe || !elements) return;

        setLoading(true);
        setError(false);
        setSuccess(false);
        setMessage('');

        try {
            // Read form values from DOM — preserves Forms.js independence
            const email = document.querySelector('#email')?.value;
            const phone = document.querySelector('#phone')?.value;
            const password = document.querySelector('#password')?.value;
            const country = document.querySelector('#search_country')?.value;

            if (!email || !phone || !country || !password) {
                setError(true);
                setMessage('Please fill in all required fields.');
                setLoading(false);
                return;
            }

            // Tokenize card with Stripe
            const cardElement = elements.getElement(CardElement);
            const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: { email, phone },
            });

            if (pmError) {
                setError(true);
                setMessage(pmError.message);
                setLoading(false);
                return;
            }

            // Call backend to create customer + subscription + Neon user
            const result = await fetch('/api/stripe/create-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethodId: paymentMethod.id,
                    email, phone, country, password,
                    amount, term, trial,
                }),
            }).then(r => r.json());

            // Handle 3DS (rare for 7-day trial — no immediate charge)
            if (result.requiresAction) {
                const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
                if (confirmError) {
                    setError(true);
                    setMessage(confirmError.message);
                    setLoading(false);
                    return;
                }
            }

            if (result.existingCustomer) {
                setError(true);
                setMessage('An account with this email already exists. Please log in.');
                setLoading(false);
                return;
            }

            if (!result.subscriptionCreated) {
                setError(true);
                setMessage(result.message || 'Subscription creation failed. Please try again.');
                setLoading(false);
                return;
            }

            // Success — same redirect logic as before
            const parsed = JSON.parse(result.data);
            const user = await storeInLocalStorage(parsed);
            setSuccess(true);
            setMessage(`${result.message}. Redirecting To Your Workouts...`);
            router.push(
                `https://my.gymnasticbodies.com/?authToken=${user.token}&refreshToken=${user.token}&refreshExpireTime=${user.refreshExpireTime}&AuthExpirationDate=${user.expirationDate}&timezone=${user.timezone}&postAWS=${user.postAWS}&userId=${user.id}&username=${user.email}&name=${user.name}`
            );
        } catch (err) {
            console.error('PaymentPortal error:', err);
            setError(true);
            setMessage('Something went wrong. Please Try Again.');
        } finally {
            setLoading(false);
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#32325d',
                fontFamily: '"Open Sans", Helvetica, sans-serif',
                '::placeholder': { color: '#aab7c4' },
            },
            invalid: { color: '#dc2626' },
        },
    };

    const cardWrapperStyle = {
        gridColumn: 'span 2',
        border: '1px solid rgba(0,0,0,0.23)',
        borderRadius: '4px',
        padding: '14px 12px',
        marginTop: '8px',
    };

    return (
        <>
            <div style={{ gridColumn: 'span 2', width: '100%' }}>
                <div style={cardWrapperStyle}>
                    <CardElement options={cardElementOptions} />
                </div>
                <Button
                    type="button"
                    variant="contained"
                    color="primary"
                    style={{ marginTop: '2em', width: 'max-content' }}
                    onClick={handleSubmit}
                    disabled={loading || !stripe}
                >
                    {props?.data?.buttonText ? props?.data?.buttonText : 'Confirm & Pay'}
                </Button>
            </div>
            {error &&
                <Alert variant="filled" severity="error" style={{ marginTop: '20px', gridColumn: 'span 2' }}>
                    {message}
                </Alert>
            }
            {success &&
                <Alert severity="success" style={{ marginTop: '20px', gridColumn: 'span 2' }}>{message}</Alert>
            }
            {loading &&
                <CircularIndeterminate incomingStyle={{ width: '100%', height: '100%', top: '0', left: '0', background: '#FAFAFA', opacity: '0.3', zIndex: '5' }} />
            }
        </>
    );
}
