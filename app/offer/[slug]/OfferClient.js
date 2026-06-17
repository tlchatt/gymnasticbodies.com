'use client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import DarkNav from '@/components/DarkNav';
import { barlow, dm } from '@/lib/fonts';
import s from './offer.module.css';

const OfferPortal = dynamic(() => import('./OfferPortal'), { ssr: false });

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function OfferInner({ slug, offer }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email')?.trim().toLowerCase() ?? '');
  const [emailInput, setEmailInput] = useState('');
  const [status, setStatus] = useState(email ? 'loading' : 'no_email');

  useEffect(() => {
    if (!email) return;
    fetch(`/api/offer/${slug}/eligibility?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => setStatus(data.eligible ? 'eligible' : data.reason))
      .catch(() => setStatus('error'));
  }, [email, slug]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    setEmail(trimmed);
    setStatus('loading');
  };

  if (status === 'no_email') {
    return (
      <div className={s.body}>
        <div className={s.glow} />
        <span className={s.overline}>GymnasticBodies · Legacy Offer</span>
        <h1 className={s.headline}>
          {offer.headline}
          <span className={s.headlineAccent}>{offer.headlineAccent}</span>
        </h1>
        <p className={s.sub}>{offer.subheadline}</p>
        <form onSubmit={handleEmailSubmit} className={s.emailForm}>
          <input
            className={s.emailInput}
            type="email"
            placeholder="Enter your email address"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            required
          />
          <button type="submit" className={s.ctaBtn}>Check My Offer</button>
        </form>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className={s.body}>
        <div className={s.glow} />
        <p className={s.loading}>Checking offer eligibility…</p>
      </div>
    );
  }

  if (status === 'already_subscribed') {
    return (
      <div className={s.body}>
        <div className={s.glow} />
        <span className={s.overline}>GymnasticBodies · Legacy Offer</span>
        <h1 className={s.headline}>
          You&apos;re
          <span className={s.headlineAccent}>Already In.</span>
        </h1>
        <p className={s.infoMsg}>
          Your account is already active.{' '}
          <a href="https://my.gymnasticbodies.com" className={s.infoLink}>Go to your workouts →</a>
        </p>
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className={s.body}>
        <div className={s.glow} />
        <span className={s.overline}>GymnasticBodies · Legacy Offer</span>
        <h1 className={s.headline}>
          Offer Not
          <span className={s.headlineAccent}>Available.</span>
        </h1>
        <p className={s.infoMsg}>
          This offer isn&apos;t available for <strong>{email}</strong>. If you believe this is an error, please{' '}
          <a href="mailto:support@gymnasticbodies.com" className={s.infoLink}>contact support</a>.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={s.body}>
        <div className={s.glow} />
        <p className={s.errorMsg}>Something went wrong. Please try refreshing the page or <a href="mailto:support@gymnasticbodies.com" className={s.infoLink}>contact support</a>.</p>
      </div>
    );
  }

  return (
    <div className={s.body}>
      <div className={s.glow} />
      <span className={s.overline}>GymnasticBodies · Legacy Offer</span>
      <h1 className={s.headline}>
        {offer.headline}
        <span className={s.headlineAccent}>{offer.headlineAccent}</span>
      </h1>
      <p className={s.sub}>{offer.subheadline}</p>
      <OfferPortal email={email} offer={offer} />
    </div>
  );
}

export default function OfferClient({ slug, offer }) {
  return (
    <div className={`${s.page} ${barlow.variable} ${dm.variable}`}>
      <DarkNav />
      <Elements stripe={stripePromise}>
        <Suspense fallback={<div className={s.body}><p className={s.loading}>Loading…</p></div>}>
          <OfferInner slug={slug} offer={offer} />
        </Suspense>
      </Elements>
    </div>
  );
}
