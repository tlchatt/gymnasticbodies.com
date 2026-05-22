'use client';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import CircularIndeterminate from '@/components/CircularLoading';
import { useState, useEffect } from 'react';

const STANDARD_PRICE = '75';
const STANDARD_TERM = 'monthly';
const GRANDFATHERED_MONTHLY_PRICE = '50';
const STANDARD_ANNUAL_PRICE = '720';
const STANDARD_ANNUAL_TERM = 'annually';

function formatBilling(price, term) {
    const amount = parseFloat(price);
    if (isNaN(amount)) return '$75.00 / month';
    const t = term?.toLowerCase();
    if (t === 'annually') return `$${amount.toFixed(2)} / year`;
    if (t === 'quarterly') return `$${amount.toFixed(2)} / quarter`;
    return `$${amount.toFixed(2)} / month`;
}

export default function RenewalPortal({ email }) {
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
                color: '#32325d',
                fontFamily: '"Open Sans", Helvetica, sans-serif',
                '::placeholder': { color: '#aab7c4' },
            },
            invalid: { color: '#dc2626' },
        },
    };

    const wrapperStyle = {
        maxWidth: '480px',
        margin: '24px auto',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    };

    const cardWrapperStyle = {
        border: '1px solid rgba(0,0,0,0.23)',
        borderRadius: '4px',
        padding: '14px 12px',
    };

    return (
        <div style={wrapperStyle}>
            <Typography variant="h5" gutterBottom style={{ color: '#333' }}>
                Renew Your Subscription
            </Typography>
            <Typography variant="body1" style={{ color: '#555' }}>
                Your subscription has expired. Enter your card details below to continue.
            </Typography>

            {email && (
                <Typography variant="body2" style={{ color: '#777' }}>
                    Account: <strong>{email}</strong>
                </Typography>
            )}

            {!hasValidHistoricalData ? (
                <Typography variant="body2" style={{ color: '#444', fontWeight: 600 }}>
                    You will be billed {formatBilling(GRANDFATHERED_MONTHLY_PRICE, STANDARD_TERM)}
                </Typography>
            ) : !isMonthlyTerm ? (
                historicalAboveThreshold ? (
                    <Typography variant="body2" style={{ color: '#444', fontWeight: 600 }}>
                        You will be billed {formatBilling(GRANDFATHERED_MONTHLY_PRICE, STANDARD_TERM)}
                    </Typography>
                ) : (
                    <RadioGroup value={billingChoice} onChange={e => setBillingChoice(e.target.value)}>
                        <FormControlLabel
                            value="historical"
                            control={<Radio color="primary" />}
                            label={`Keep my plan — ${formatBilling(historicalPrice, historicalTerm)}`}
                        />
                        <FormControlLabel
                            value="grandfathered_monthly"
                            control={<Radio color="primary" />}
                            label={`Switch to monthly — ${formatBilling(GRANDFATHERED_MONTHLY_PRICE, STANDARD_TERM)}`}
                        />
                    </RadioGroup>
                )
            ) : (
                <Typography variant="body2" style={{ color: '#444', fontWeight: 600 }}>
                    You will be billed {formatBilling(selectedPrice, selectedTerm)}
                </Typography>
            )}

            <div style={cardWrapperStyle}>
                <CardElement options={cardElementOptions} />
            </div>

            <Button
                type="button"
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={loading || !stripe || success}
                style={{ width: '100%' }}
            >
                Renew Subscription
            </Button>

            {error && (
                <Alert variant="filled" severity="error" style={{ marginTop: '8px' }}>
                    {message}
                </Alert>
            )}
            {success && (
                <Alert severity="success" style={{ marginTop: '8px' }}>
                    {message}
                </Alert>
            )}
            {loading && (
                <CircularIndeterminate incomingStyle={{ width: '100%', height: '100%', top: '0', left: '0', background: '#FAFAFA', opacity: '0.3', zIndex: '5' }} />
            )}
        </div>
    );
}
