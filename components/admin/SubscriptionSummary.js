'use client';

// Shared subscription panel for the case screen and the user detail page —
// keeps both in sync. Renders the `subscription` summary built server-side by
// buildSubscriptionSummary (access source, live Stripe price/status, offer
// conversion) plus the gateway IDs as Stripe dashboard links.

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function money(cents, currency = 'usd') {
  if (cents == null) return null;
  const v = (Number(cents) / 100).toFixed(2);
  return currency && currency !== 'usd' ? `${v} ${currency.toUpperCase()}` : `$${v}`;
}

function accessSourceLabel(src) {
  return src === 'stripe' ? 'Stripe · paying subscriber'
    : src === 'auth_net' ? 'Auth.net · legacy subscriber'
    : src === 'legacy_renewaldate' ? 'Legacy renewal date (pre-migration)'
    : 'Unknown';
}

const title = { fontSize: '0.72rem', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 };
const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid #1a1a1a', fontSize: '0.78rem' };
const keyCss = { color: '#666', flex: '0 0 auto' };
const valCss = { color: '#ccc', textAlign: 'right', wordBreak: 'break-all' };
const idCss = { ...valCss, fontSize: '0.68rem' };
const link = { color: 'var(--accent)', textDecoration: 'none', fontSize: '0.68rem', wordBreak: 'break-all' };

function Row({ k, children, valStyle }) {
  return (
    <div style={row}>
      <span style={keyCss}>{k}</span>
      <span style={{ ...valCss, ...valStyle }}>{children}</span>
    </div>
  );
}

export default function SubscriptionSummary({ subscription: sub, setting, showTitle = true }) {
  if (!sub && !setting) return null;

  const live = sub?.stripeLive;

  return (
    <div>
      {showTitle && <div style={title}>Subscription</div>}

      {sub && (
        <>
          <Row k="Access via" valStyle={{ color: sub.accessSource === 'stripe' ? 'var(--accent-light)' : sub.accessSource === 'legacy_renewaldate' ? '#fcb14e' : '#ccc' }}>
            {accessSourceLabel(sub.accessSource)}
          </Row>

          {sub.productName && <Row k="Plan">{sub.productName}</Row>}

          {(live?.amount != null || sub.price != null) && (
            <Row k="Price">
              {live?.amount != null
                ? `${money(live.amount, live.currency)}/${live.interval ?? sub.term ?? ''}`
                : `$${sub.price}${sub.term ? `/${sub.term}` : ''}`}
            </Row>
          )}

          {live && !live.error && (
            <>
              <Row k="Stripe status" valStyle={{ color: live.status === 'active' || live.status === 'trialing' ? 'var(--accent-light)' : '#e66' }}>
                {live.status}{live.cancelAtPeriodEnd ? ' · cancels at period end' : ''}
              </Row>
              {live.currentPeriodEnd && <Row k="Next charge">{fmtDate(live.currentPeriodEnd)}</Row>}
            </>
          )}
          {live?.error && <Row k="Stripe status" valStyle={{ color: '#e66' }}>could not load from Stripe</Row>}

          {!sub.isStripe && sub.renewalDate && <Row k="Renews / expires">{fmtDate(sub.renewalDate)}</Row>}

          {!sub.isStripe && sub.paymentMethod && sub.paymentMethod !== 'N/A' && (
            <Row k="Payment method">{sub.paymentMethod.replace(/_/g, ' ')}</Row>
          )}

          {sub.startDate && <Row k="Customer since">{fmtDate(sub.startDate)}</Row>}

          {sub.offerConversion && (
            <Row k="Offer accepted" valStyle={{ color: 'var(--accent-light)' }}>
              {sub.offerConversion.slug}
              {sub.offerConversion.price ? ` · $${sub.offerConversion.price}/${sub.offerConversion.term ?? ''}` : ''}
              {sub.offerConversion.at ? ` · ${fmtDate(sub.offerConversion.at)}` : ''}
            </Row>
          )}
        </>
      )}

      {/* Gateway IDs → Stripe dashboard links */}
      {setting?.stripeSubscriptionId && (
        <div style={row}>
          <span style={keyCss}>Stripe sub</span>
          <a style={link} href={`https://dashboard.stripe.com/subscriptions/${setting.stripeSubscriptionId}`} target="_blank" rel="noopener noreferrer">
            {setting.stripeSubscriptionId}
          </a>
        </div>
      )}
      {setting?.stripeCustomerId && (
        <div style={row}>
          <span style={keyCss}>Stripe customer</span>
          <a style={link} href={`https://dashboard.stripe.com/customers/${setting.stripeCustomerId}`} target="_blank" rel="noopener noreferrer">
            {setting.stripeCustomerId}
          </a>
        </div>
      )}
      {setting?.authorizeSubscriptionId && (
        <div style={{ ...row, borderBottom: 'none' }}>
          <span style={keyCss}>Auth.net sub</span>
          <span style={idCss}>{setting.authorizeSubscriptionId}</span>
        </div>
      )}
    </div>
  );
}
