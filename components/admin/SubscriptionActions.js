'use client';
import { useState } from 'react';

// Cancel + Refund admin actions. Reused on the case screen and the user
// detail page. Uniform flow for every user; the server decides what each
// gateway actually supports (Stripe = real cancel/refund; others = app-level
// cancel and no refundable charges).

const BTN = {
  fontSize: 12,
  padding: '6px 10px',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-muted)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  width: '100%',
};
const DANGER = { ...BTN, borderColor: 'rgba(230,102,102,0.5)', color: '#f0a3a3' };
const INPUT = {
  fontSize: 12,
  padding: '6px 8px',
  background: 'var(--bg-base)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text)',
  borderRadius: 'var(--radius-sm)',
  width: '100%',
};
const msgOk = { fontSize: 11, color: 'var(--accent-light)' };
const msgErr = { fontSize: 11, color: '#e66' };
const label = { fontSize: 11, color: 'var(--text-subtle)' };

function money(cents, currency = 'usd') {
  const v = (Number(cents) / 100).toFixed(2);
  return currency && currency !== 'usd' ? `${v} ${currency.toUpperCase()}` : `$${v}`;
}
function fmtDate(unixSec) {
  return new Date(unixSec * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SubscriptionActions({ userId, hasStripeSub = false, onChanged }) {
  // Cancel
  const [cancelStage, setCancelStage] = useState('idle'); // idle | confirm | loading | ok | error
  const [immediate, setImmediate] = useState(false);
  const [cancelMsg, setCancelMsg] = useState('');

  // Refund
  const [refundOpen, setRefundOpen] = useState(false);
  const [charges, setCharges] = useState(null);
  const [chargesErr, setChargesErr] = useState('');
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundStage, setRefundStage] = useState('idle'); // idle | loading | ok | error
  const [refundMsg, setRefundMsg] = useState('');

  async function doCancel() {
    setCancelStage('loading');
    setCancelMsg('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediate }),
      });
      const json = await res.json();
      if (json.ok) {
        setCancelMsg(
          json.method === 'app' ? 'Access revoked (app-level). Stop billing in the gateway portal if applicable.'
            : json.cancelAtPeriodEnd ? `Cancels at period end${json.accessUntil ? ` · access until ${fmtDate(json.accessUntil)}` : ''}`
            : 'Subscription cancelled immediately'
        );
        setCancelStage('ok');
        onChanged?.();
      } else {
        setCancelMsg(json.error ?? 'Cancel failed');
        setCancelStage('error');
      }
    } catch {
      setCancelMsg('Request failed');
      setCancelStage('error');
    }
  }

  async function openRefund() {
    setRefundOpen(true);
    if (charges != null) return;
    setChargesErr('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/charges`);
      const json = await res.json();
      if (json.error) { setChargesErr(json.error); setCharges([]); return; }
      setCharges(json.charges ?? []);
    } catch {
      setChargesErr('Failed to load payments');
      setCharges([]);
    }
  }

  function selectCharge(c) {
    setSelected(c.id);
    setAmount((c.refundable / 100).toFixed(2)); // prefill full remaining
    setRefundStage('idle');
    setRefundMsg('');
  }

  async function doRefund() {
    if (!selected) return;
    const dollars = Number(amount);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setRefundMsg('Enter a valid amount'); setRefundStage('error'); return;
    }
    setRefundStage('loading');
    setRefundMsg('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargeId: selected, amountCents: Math.round(dollars * 100), reason: reason || undefined }),
      });
      const json = await res.json();
      if (json.ok) {
        setRefundMsg(`Refunded ${money(json.amount, json.currency)}`);
        setRefundStage('ok');
        setCharges(null); // force reload of charge list to reflect new refunded balance
        setSelected('');
        onChanged?.();
      } else {
        setRefundMsg(json.error ?? 'Refund failed');
        setRefundStage('error');
      }
    } catch {
      setRefundMsg('Request failed');
      setRefundStage('error');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {/* Cancel */}
      {cancelStage === 'confirm' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, border: '1px solid rgba(230,102,102,0.4)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 12, color: 'var(--text)' }}>Cancel this subscription?</div>
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={immediate} onChange={(e) => setImmediate(e.target.checked)} />
            Cancel immediately (revoke access now instead of at period end)
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={{ ...DANGER, flex: 1 }} onClick={doCancel}>Confirm cancel</button>
            <button style={{ ...BTN, flex: '0 0 auto', width: 'auto' }} onClick={() => setCancelStage('idle')}>Back</button>
          </div>
        </div>
      ) : (
        <button
          style={cancelStage === 'ok' ? { ...BTN, color: 'var(--accent-light)' } : DANGER}
          onClick={() => setCancelStage('confirm')}
          disabled={cancelStage === 'loading' || cancelStage === 'ok'}
        >
          {cancelStage === 'loading' ? 'Cancelling…'
            : cancelStage === 'ok'   ? '✓ Cancelled'
            : cancelStage === 'error' ? '✗ Failed — retry?'
            : 'Cancel subscription'}
        </button>
      )}
      {cancelMsg && <div style={cancelStage === 'ok' ? msgOk : msgErr}>{cancelMsg}</div>}

      {/* Refund */}
      {!refundOpen ? (
        <button style={BTN} onClick={openRefund}>Refund a payment…</button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text)' }}>Refund a payment</span>
            <button style={{ ...BTN, width: 'auto', padding: '2px 8px' }} onClick={() => setRefundOpen(false)}>Close</button>
          </div>

          {charges == null ? (
            <div style={label}>Loading payments…</div>
          ) : charges.length === 0 ? (
            <div style={label}>{chargesErr || 'No refundable Stripe payments for this user.'}</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {charges.map((c) => {
                const isSel = selected === c.id;
                const done = c.refundable <= 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => !done && selectCharge(c)}
                    disabled={done}
                    style={{
                      textAlign: 'left', display: 'flex', justifyContent: 'space-between', gap: 8,
                      fontSize: 12, padding: '6px 8px', borderRadius: 'var(--radius-sm)', cursor: done ? 'default' : 'pointer',
                      background: isSel ? 'rgba(240,86,33,0.12)' : 'var(--bg-base)',
                      border: `1px solid ${isSel ? 'var(--border-accent)' : 'var(--border-subtle)'}`,
                      color: done ? 'var(--text-subtle)' : 'var(--text)',
                    }}
                  >
                    <span>{money(c.amount, c.currency)} · {fmtDate(c.created)}</span>
                    <span style={{ color: 'var(--text-subtle)' }}>
                      {done ? 'refunded' : c.amountRefunded > 0 ? `${money(c.refundable, c.currency)} left` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {selected && (
            <>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={label}>Amount $</span>
                <input style={{ ...INPUT, width: 90 }} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </div>
              <input style={INPUT} placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <button
                style={refundStage === 'ok' ? { ...BTN, color: 'var(--accent-light)' } : DANGER}
                onClick={doRefund}
                disabled={refundStage === 'loading'}
              >
                {refundStage === 'loading' ? 'Refunding…' : refundStage === 'ok' ? '✓ Refunded' : `Issue refund $${amount || '0.00'}`}
              </button>
            </>
          )}
          {refundMsg && <div style={refundStage === 'ok' ? msgOk : msgErr}>{refundMsg}</div>}
        </div>
      )}
    </div>
  );
}
