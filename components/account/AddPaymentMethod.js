'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useState, useEffect, useRef } from 'react';

// Singleton Stripe instance — created once at module scope so it isn't
// re-initialized on every render. Matches RenewalPortal / RenewClient setup.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

// ── CardElement styling — light theme to match the /accountDetails My Account page ──
const cardElementOptions = {
    style: {
        base: {
            fontSize: '16px',
            color: '#333',
            fontFamily: '"DM Sans", sans-serif',
            '::placeholder': { color: '#999' },
        },
        invalid: { color: '#d32f2f' },
    },
};

// ── Inline style objects (light theme, matching components/account/accountUi.js) ──
const wrapStyle = {
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
};

const cardFieldLabelStyle = {
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
    fontSize: '0.68rem',
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    color: '#666',
    marginBottom: '10px',
};

// White field box mirroring the Profile inputs in AccountDetailsComp.js.
const cardBoxStyle = {
    border: '1px solid #ddd',
    borderRadius: '6px',
    padding: '10px 12px',
    background: '#fff',
    transition: 'border-color 0.2s ease',
};

const cardHintStyle = {
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
    fontSize: '0.72rem',
    color: '#999',
    marginTop: '8px',
    letterSpacing: '0.05em',
};

const ctaBtnBase = {
    width: '100%',
    display: 'block',
    background: 'linear-gradient(135deg, #fcb14e 0%, #f05621 100%)',
    color: '#fff',
    fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
    fontWeight: 700,
    fontSize: '1rem',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    border: 'none',
    padding: '18px 24px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease',
    marginTop: '20px',
    marginBottom: '16px',
};

const errorMsgStyle = {
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
    fontSize: '0.9rem',
    color: '#d32f2f',
    background: '#fdecea',
    border: '1px solid #f5c6c3',
    borderRadius: '8px',
    padding: '12px 16px',
};

const successMsgStyle = {
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
    fontSize: '0.9rem',
    color: '#2e7d32',
    background: '#edf7ed',
    border: '1px solid #c8e6c9',
    borderRadius: '8px',
    padding: '12px 16px',
};

const savedCardBoxStyle = {
    border: '1px solid #c8e6c9',
    background: '#edf7ed',
    borderRadius: '8px',
    padding: '18px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontFamily: 'var(--font-body, "DM Sans", sans-serif)',
    color: '#2e7d32',
    fontSize: '0.95rem',
};

function formatBrand(brand) {
    if (!brand) return 'Card';
    return brand.charAt(0).toUpperCase() + brand.slice(1);
}

// ── Inner form (must live inside <Elements> to use the Stripe hooks) ──
function AddCardForm({ userId, onSaved }) {
    const stripe = useStripe();
    const elements = useElements();

    const [clientSecret, setClientSecret] = useState('');
    const [initError, setInitError] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [savedCard, setSavedCard] = useState(null);
    const submittingRef = useRef(false);

    // On mount: create/fetch a SetupIntent for this user.
    useEffect(() => {
        if (!userId) {
            setInitError('Missing account reference. Please reload the page and try again.');
            return;
        }
        let cancelled = false;
        fetch('/api/stripe/setup-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        })
            .then(r => r.json())
            .then(data => {
                if (cancelled) return;
                if (data.clientSecret) {
                    setClientSecret(data.clientSecret);
                } else {
                    setInitError(data.message ?? 'Could not initialize the payment form. Please try again.');
                }
            })
            .catch(() => {
                if (!cancelled) setInitError('Could not initialize the payment form. Please try again.');
            });
        return () => { cancelled = true; };
    }, [userId]);

    const handleSubmit = async () => {
        // useRef guard against double-submit — setState is async and won't block a fast re-click.
        if (!stripe || !elements || !clientSecret || submittingRef.current) return;
        submittingRef.current = true;

        setLoading(true);
        setError(false);
        setSuccess(false);
        setMessage('');

        try {
            const cardElement = elements.getElement(CardElement);

            const { setupIntent, error: confirmError } = await stripe.confirmCardSetup(clientSecret, {
                payment_method: { card: cardElement },
            });

            if (confirmError) {
                const isIncomplete = confirmError.message?.toLowerCase().includes('incomplete');
                setError(true);
                setMessage(isIncomplete
                    ? "Please fill in all card fields — card number, expiry date, CVC, and ZIP code. If the form isn't responding, try disabling your ad blocker or switching browsers."
                    : confirmError.message
                );
                setLoading(false);
                submittingRef.current = false;
                return;
            }

            const paymentMethodId = setupIntent?.payment_method;

            const result = await fetch('/api/stripe/save-payment-method', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, paymentMethodId }),
            }).then(r => r.json());

            if (!result.success) {
                setError(true);
                setMessage(result.message ?? 'We could not save your card. Please try again.');
                setLoading(false);
                submittingRef.current = false;
                return;
            }

            const cardBrand = result.cardBrand ?? null;
            const cardLast4 = result.cardLast4 ?? null;

            setSavedCard({ cardBrand, cardLast4 });
            setSuccess(true);
            setMessage('Your card has been saved.');
            if (onSaved) onSaved({ cardBrand, cardLast4 });
        } catch (err) {
            console.error('AddPaymentMethod error:', err);
            setError(true);
            setMessage('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
            submittingRef.current = false;
        }
    };

    // Success state — replace the form with a saved-card summary.
    if (success) {
        return (
            <div style={wrapStyle}>
                <div style={savedCardBoxStyle}>
                    <span aria-hidden="true">✓</span>
                    <span>
                        {savedCard?.cardLast4
                            ? `${formatBrand(savedCard.cardBrand)} ending in ${savedCard.cardLast4} saved.`
                            : 'Your payment method has been saved.'}
                    </span>
                </div>
            </div>
        );
    }

    // Init failure — surface the error and don't render an unusable form.
    if (initError) {
        return (
            <div style={wrapStyle}>
                <p style={errorMsgStyle}>{initError}</p>
            </div>
        );
    }

    const ctaDisabled = loading || !stripe || !clientSecret;
    const ctaStyle = ctaDisabled
        ? { ...ctaBtnBase, opacity: 0.45, cursor: 'not-allowed' }
        : ctaBtnBase;

    return (
        <div style={wrapStyle}>
            <p style={cardFieldLabelStyle}>Card details</p>
            <div style={cardBoxStyle}>
                <CardElement options={cardElementOptions} />
            </div>
            <p style={cardHintStyle}>Card number &nbsp;·&nbsp; MM / YY &nbsp;·&nbsp; CVC &nbsp;·&nbsp; ZIP</p>

            <button
                type="button"
                style={ctaStyle}
                onClick={handleSubmit}
                disabled={ctaDisabled}
            >
                {loading ? 'Saving...' : 'Save Card'}
            </button>

            {error && <p style={errorMsgStyle}>{message}</p>}
        </div>
    );
}

// ── Default export — wraps the form in its own <Elements> provider so it is
// safe to mount standalone via next/dynamic({ ssr: false }). ──
export default function AddPaymentMethod({ userId, onSaved }) {
    return (
        <Elements stripe={stripePromise}>
            <AddCardForm userId={userId} onSaved={onSaved} />
        </Elements>
    );
}
