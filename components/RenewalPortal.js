'use client';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useState, useEffect, useRef } from 'react';
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

export default function RenewalPortal({ email, token, userId, onNameLoaded }) {
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
    const submittingRef = useRef(false);

    const [userName, setUserName] = useState('');
    const [supportOpen, setSupportOpen] = useState(false);
    const [supportName, setSupportName] = useState('');
    const [supportMessage, setSupportMessage] = useState('');
    const [supportSending, setSupportSending] = useState(false);
    const [supportSent, setSupportSent] = useState(false);
    const [supportError, setSupportError] = useState('');

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
                if (data.name) {
                    setUserName(data.name);
                    setSupportName(data.name);
                    if (onNameLoaded) onNameLoaded(data.name, token, userId);
                }
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
        if (!stripe || !elements || submittingRef.current) return;
        submittingRef.current = true;

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
                const isIncomplete = pmError.message?.toLowerCase().includes('incomplete') || pmError.message?.toLowerCase().includes('incomplet') || pmError.message?.toLowerCase().includes('ufullstendig') || pmError.message?.toLowerCase().includes('ofullständigt') || pmError.message?.toLowerCase().includes('niepełny');
                setError(true);
                setMessage(isIncomplete
                    ? 'Please fill in all card fields — card number, expiry date, CVC, and ZIP code. If the form isn\'t responding, try disabling your ad blocker or switching browsers.'
                    : pmError.message
                );
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
            window.location.href = `https://my.gymnasticbodies.com/?authToken=${token}&refreshToken=${token}&postAWS=true&userId=${userId}&username=${encodeURIComponent(email)}&name=${encodeURIComponent(name ?? '')}&source=renewal`;
        } catch (err) {
            console.error('RenewalPortal error:', err);
            setError(true);
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    const handleSupportSubmit = async () => {
        if (!supportMessage.trim() || supportSending) return;
        setSupportSending(true);
        setSupportError('');
        try {
            const res = await fetch('/api/user/contactUs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: 'support@gymnasticbodies.com',
                    from: 'contact@gymnasticbodies.com',
                    replyTo: email,
                    subject: `app.gymnasticbodies.com Contact Form Submission from ${supportName || email}`,
                    name: supportName || email,
                    email,
                    phone: 'N/A',
                    message: supportMessage,
                }),
            });
            if (res.ok) {
                setSupportSent(true);
            } else {
                setSupportError('Failed to send. Please email support@gymnasticbodies.com directly.');
            }
        } catch {
            setSupportError('Failed to send. Please email support@gymnasticbodies.com directly.');
        } finally {
            setSupportSending(false);
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#ffffff',
                fontFamily: '"DM Sans", sans-serif',
                '::placeholder': { color: 'rgba(255,255,255,0.65)' },
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
                    <p className={s.cardHint}>Card number &nbsp;·&nbsp; MM / YY &nbsp;·&nbsp; CVC &nbsp;·&nbsp; ZIP</p>
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

                <div className={s.supportSection}>
                    <button
                        className={s.supportToggle}
                        onClick={() => setSupportOpen(o => !o)}
                        type="button"
                    >
                        {supportOpen ? 'Hide support form' : 'Need help? Contact support'}
                    </button>

                    {supportOpen && (
                        <div className={s.supportForm}>
                            {supportSent ? (
                                <p className={s.successMsg}>Message sent! We&apos;ll get back to you shortly.</p>
                            ) : (
                                <>
                                    <input
                                        className={s.supportInput}
                                        type="text"
                                        placeholder="Your name"
                                        value={supportName}
                                        onChange={e => setSupportName(e.target.value)}
                                    />
                                    <input
                                        className={s.supportInput}
                                        type="email"
                                        value={email || ''}
                                        readOnly
                                    />
                                    <textarea
                                        className={s.supportTextarea}
                                        placeholder="How can we help you?"
                                        rows={4}
                                        value={supportMessage}
                                        onChange={e => setSupportMessage(e.target.value)}
                                    />
                                    {supportError && <p className={s.errorMsg}>{supportError}</p>}
                                    <button
                                        className={s.supportSendBtn}
                                        onClick={handleSupportSubmit}
                                        disabled={supportSending || !supportMessage.trim()}
                                        type="button"
                                    >
                                        {supportSending ? 'Sending...' : 'Send Message'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
