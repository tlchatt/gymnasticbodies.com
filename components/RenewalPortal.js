'use client';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useState, useEffect } from 'react';
import s from './RenewalPortal.module.css';

const STANDARD_TERM = 'monthly';
const GRANDFATHERED_MONTHLY_PRICE = '50';

function parseBilling(price, term) {
    const amount = parseFloat(price);
    if (isNaN(amount)) return { display: '$50', unit: '/ mo' };
    const t = term?.toLowerCase();
    const fmt = n => n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
    if (t === 'annually') return { display: fmt(amount), unit: '/ yr' };
    if (t === 'quarterly') return { display: fmt(amount), unit: '/ qtr' };
    return { display: fmt(amount), unit: '/ mo' };
}

function formatBillingLabel(price, term) {
    const amount = parseFloat(price);
    if (isNaN(amount)) return '$50 / month';
    const t = term?.toLowerCase();
    if (t === 'annually') return `$${amount.toFixed(2)} / year`;
    if (t === 'quarterly') return `$${amount.toFixed(2)} / quarter`;
    return `$${amount.toFixed(2)} / month`;
}

export default function RenewalPortal({ email, onNameLoaded }) {
    const stripe = useStripe();
    const elements = useElements();

    const [error, setError] = useState(false);
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [historicalPrice, setHistoricalPrice] = useState(null);
    const [historicalTerm, setHistoricalTerm] = useState(null);
    const [hasValidHistoricalData, setHasValidHistoricalData] = useState(false);
    const [billingChoice, setBillingChoice] = useState('historical');

    useEffect(() => {
        if (!email) return;
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'renew.page_view', email }),
        }).catch(() => {});
        fetch(`/api/user/renewalStatus?email=${encodeURIComponent(email)}`)
            .then(r => r.json())
            .then(data => {
                if (data.price) setHistoricalPrice(data.price);
                if (data.term) setHistoricalTerm(data.term);
                setHasValidHistoricalData(!!data.hasValidHistoricalData);
                if (!data.hasValidHistoricalData) setBillingChoice('standard_monthly');
                if (data.name && onNameLoaded) onNameLoaded(data.name);
            })
            .catch(() => {});
    }, [email]);

    const isMonthlyTerm = historicalTerm?.toLowerCase() === 'monthly';

    const historicalMonthlyEquivalent = (() => {
        const amount = parseFloat(historicalPrice);
        if (isNaN(amount)) return 0;
        const t = historicalTerm?.toLowerCase();
        if (t === 'annually') return amount / 12;
        if (t === 'quarterly') return amount / 3;
        return amount;
    })();
    const historicalAboveThreshold = historicalMonthlyEquivalent > parseFloat(GRANDFATHERED_MONTHLY_PRICE);

    let selectedPrice, selectedTerm;
    if (!hasValidHistoricalData) {
        selectedPrice = GRANDFATHERED_MONTHLY_PRICE;
        selectedTerm  = STANDARD_TERM;
    } else if (!isMonthlyTerm) {
        if (historicalAboveThreshold) {
            selectedPrice = GRANDFATHERED_MONTHLY_PRICE;
            selectedTerm  = STANDARD_TERM;
        } else {
            selectedPrice = billingChoice === 'grandfathered_monthly' ? GRANDFATHERED_MONTHLY_PRICE : historicalPrice;
            selectedTerm  = billingChoice === 'grandfathered_monthly' ? STANDARD_TERM               : historicalTerm;
        }
    } else {
        selectedPrice = historicalPrice;
        selectedTerm  = historicalTerm;
    }

    const handleSubmit = async () => {
        if (!stripe || !elements) return;

        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'renew.form_submit', email, price: selectedPrice, term: selectedTerm }),
        }).catch(() => {});

        setLoading(true);
        setError(false);
        setSuccess(false);
        setMessage('');

        try {
            if (!email) {
                setError(true);
                setMessage('Email is required. Please return to the login page and try again.');
                setLoading(false);
                return;
            }

            const cardElement = elements.getElement(CardElement);
            const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElement,
                billing_details: { email },
            });

            if (pmError) {
                fetch('/api/log', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'renew.card_error', level: 'warn', email, message: pmError.message }),
                }).catch(() => {});
                setError(true);
                setMessage(pmError.message);
                setLoading(false);
                return;
            }

            const result = await fetch('/api/stripe/renew-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethodId: paymentMethod.id,
                    email,
                    price: selectedPrice,
                    term: selectedTerm,
                }),
            }).then(r => r.json());

            if (result.requiresAction) {
                const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
                if (confirmError) {
                    setError(true);
                    setMessage(confirmError.message);
                    setLoading(false);
                    return;
                }
            }

            if (!result.success) {
                setError(true);
                setMessage(result.message ?? 'Renewal failed. Please try again.');
                setLoading(false);
                return;
            }

            setSuccess(true);
            setMessage('Subscription renewed! Redirecting to your workouts...');

            const { token, userId, name } = result;
            window.location.href = `https://my.gymnasticbodies.com/?authToken=${token}&refreshToken=${token}&postAWS=true&userId=${userId}&username=${encodeURIComponent(email)}&name=${encodeURIComponent(name ?? '')}`;
        } catch (err) {
            console.error('RenewalPortal error:', err);
            setError(true);
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#ffffff',
                fontFamily: '"DM Sans", sans-serif',
                '::placeholder': { color: 'rgba(255,255,255,0.35)' },
            },
            invalid: { color: '#ff8080' },
        },
    };

    const showChoice = hasValidHistoricalData && !isMonthlyTerm && !historicalAboveThreshold;
    const staticBilling = parseBilling(selectedPrice, selectedTerm);

    return (
        <>
            <div className={s.glow} />
            <div className={s.body}>
                <span className={s.overline}>GymFit · Payment Update</span>

                <h1 className={s.headline}>
                    Update Your
                    <span className={s.headlineAccent}>Payment.</span>
                </h1>

                <p className={s.sub}>
                    Your subscription has lapsed — add your card below to pick up right where you left off.
                </p>

                {email && (
                    <p className={s.emailRow}>
                        Account: <strong className={s.emailStrong}>{email}</strong>
                    </p>
                )}

                {showChoice ? (
                    <div className={s.billingChoice}>
                        {[
                            { value: 'historical', label: `Keep my plan — ${formatBillingLabel(historicalPrice, historicalTerm)}` },
                            { value: 'grandfathered_monthly', label: `Switch to monthly — ${formatBillingLabel(GRANDFATHERED_MONTHLY_PRICE, STANDARD_TERM)}` },
                        ].map(opt => {
                            const selected = billingChoice === opt.value;
                            return (
                                <div
                                    key={opt.value}
                                    className={`${s.billingOption} ${selected ? s.billingOptionSelected : ''}`}
                                    onClick={() => setBillingChoice(opt.value)}
                                >
                                    <div className={`${s.radioRing} ${selected ? s.radioRingSelected : ''}`}>
                                        {selected && <div className={s.radioDot} />}
                                    </div>
                                    <span className={`${s.billingOptionLabel} ${selected ? s.billingOptionLabelSelected : ''}`}>
                                        {opt.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className={s.billingDisplay}>
                        <p className={s.billingLabel}>You will be billed</p>
                        <div className={s.billingAmountRow}>
                            <span className={s.billingAmount}>{staticBilling.display}</span>
                            <span className={s.billingUnit}>{staticBilling.unit}</span>
                        </div>
                    </div>
                )}

                <div className={s.cardSection}>
                    <p className={s.cardFieldLabel}>Card details</p>
                    <div className={s.cardBox}>
                        <CardElement options={cardElementOptions} />
                    </div>
                </div>

                <button
                    className={s.ctaBtn}
                    onClick={handleSubmit}
                    disabled={loading || !stripe || success}
                >
                    {loading ? 'Processing...' : 'Renew Subscription →'}
                </button>

                {error && <p className={s.errorMsg}>{message}</p>}
                {success && <p className={s.successMsg}>{message}</p>}
            </div>
        </>
    );
}
