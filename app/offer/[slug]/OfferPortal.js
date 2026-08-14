'use client';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useState, useRef } from 'react';
import s from './offer.module.css';

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

function logEvent(event, data) {
  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...data }),
  }).catch(() => {});
}

export default function OfferPortal({ email, offer, slug }) {
  const stripe = useStripe();
  const elements = useElements();
  const submittingRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async () => {
    if (!stripe || !elements || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: { email },
      });

      if (pmError) {
        const isIncomplete = pmError.message?.toLowerCase().includes('incomplete');
        const msg = isIncomplete
          ? 'Please fill in all card fields — card number, expiry date, CVC, and ZIP code. If the form isn\'t responding, try disabling your ad blocker or switching browsers.'
          : pmError.message;
        logEvent('offer.card_error', { email, slug, message: msg });
        setError(msg);
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      logEvent('offer.form_submit', { email, slug, price: offer.price, term: offer.term });

      const result = await fetch('/api/stripe/offer-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethodId: paymentMethod.id,
          email,
          slug,
        }),
      }).then(r => r.json());

      if (result.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
        if (confirmError) {
          setError(confirmError.message);
          setLoading(false);
          submittingRef.current = false;
          return;
        }
      }

      if (!result.success) {
        setError(result.message ?? 'Payment failed. Please try again.');
        setLoading(false);
        submittingRef.current = false;
        return;
      }

      setSuccess(true);
      setSuccessMsg('Welcome back! Redirecting to your workouts…');

      const { token, userId, name } = result;
      window.location.href = `https://my.gymnasticbodies.com/?authToken=${token}&refreshToken=${token}&postAWS=true&userId=${userId}&username=${encodeURIComponent(email)}&name=${encodeURIComponent(name ?? '')}&source=renewal`;
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  if (success) {
    return <p className={s.successMsg}>{successMsg}</p>;
  }

  return (
    <>
      <div className={s.billingDisplay}>
        <p className={s.billingLabel}>Legacy member offer</p>
        <div className={s.billingAmountRow}>
          <span className={s.billingAmount}>{offer.priceDisplay}</span>
          <span className={s.billingUnit}>/ {offer.term === 'monthly' ? 'mo' : offer.term}</span>
        </div>
        <span className={s.billingBadge}>Cancel anytime</span>
      </div>

      {email && (
        <p className={s.emailRow}>
          Account: <strong className={s.emailStrong}>{email}</strong>
        </p>
      )}

      <div className={s.cardSection}>
        <p className={s.cardFieldLabel}>Card details</p>
        <div className={s.cardBox}>
          <CardElement options={cardElementOptions} />
        </div>
        <p className={s.cardHint}>Card number &nbsp;·&nbsp; MM / YY &nbsp;·&nbsp; CVC &nbsp;·&nbsp; ZIP</p>
      </div>

      {error && <p className={s.errorMsg}>{error}</p>}

      <button
        className={s.ctaBtn}
        onClick={handleSubmit}
        disabled={loading || !stripe}
      >
        {loading ? 'Processing…' : offer.ctaLabel}
      </button>
    </>
  );
}
