'use client';
import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import s from './userDetail.module.css';

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function migrationClass(type) {
  const map = {
    current:            s.migActiveCurrent,
    noncurrent:         s.migActiveExpired,
    stripe:             s.migStripe,
    auth_net:           s.migAuthNet,
    subscriber:         s.migActiveCurrent,
    purchased:          s.migPurchased,
    lapsed:             s.migActiveExpired,
    inactive:           s.migInactive,
    auth_net_subscriber:s.migAuthNet,
    active_current:     s.migActiveCurrent,
    active_expired:     s.migActiveExpired,
  };
  return map[type] ?? s.migUnknown;
}

function ticketStatusClass(status) {
  if (status === 'replied') return s.badgeReplied;
  if (status === 'closed')  return s.badgeClosed;
  return s.badgeOpen;
}

function caseStatusClass(status) {
  if (status === 'resolved') return s.badgeResolved;
  if (status === 'closed')   return s.badgeClosed;
  if (status === 'pending')  return s.badgePending;
  return s.badgeOpen;
}

export default function UserDetailClient({ params }) {
  const { id } = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Admin action states
  const [resetState, setResetState]     = useState('idle'); // idle | loading | ok | error
  const [extendState, setExtendState]   = useState('idle'); // idle | loading | ok | error
  const [extendMsg, setExtendMsg]       = useState('');
  const [grantState, setGrantState]     = useState('idle'); // idle | loading | ok | error
  const [grantMsg, setGrantMsg]         = useState('');
  const [grantDays, setGrantDays]       = useState('30');

  const handlePasswordReset = useCallback(async () => {
    if (resetState === 'loading') return;
    setResetState('loading');
    try {
      const res = await fetch(`/api/admin/users/${id}/send-password-reset`, { method: 'POST' });
      const json = await res.json();
      setResetState(json.ok ? 'ok' : 'error');
    } catch {
      setResetState('error');
    }
  }, [id, resetState]);

  // Stripe subscriber: extend via Stripe trial_end (+30 days)
  const handleExtendSubscription = useCallback(async () => {
    if (extendState === 'loading') return;
    setExtendState('loading');
    setExtendMsg('');
    try {
      const res = await fetch(`/api/admin/users/${id}/extend-subscription`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        const dateStr = json.newPeriodEnd ?? json.newRenewalDate;
        const label = dateStr ? ` · renews ${new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
        setExtendMsg(`+30 days granted${label}`);
        setExtendState('ok');
      } else {
        setExtendMsg(json.error ?? 'Failed');
        setExtendState('error');
      }
    } catch {
      setExtendMsg('Request failed');
      setExtendState('error');
    }
  }, [id, extendState]);

  // Non-Stripe: grant free access via app-level migration_type + renewaldate
  const handleGrantAccess = useCallback(async () => {
    if (grantState === 'loading') return;
    setGrantState('loading');
    setGrantMsg('');
    try {
      const res = await fetch(`/api/admin/users/${id}/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: grantDays === 'indefinite' ? 'indefinite' : parseInt(grantDays) }),
      });
      const json = await res.json();
      if (json.ok) {
        const label = grantDays === 'indefinite'
          ? 'Indefinite access granted'
          : `Access granted · expires ${new Date(json.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        setGrantMsg(label);
        setGrantState('ok');
      } else {
        setGrantMsg(json.error ?? 'Failed');
        setGrantState('error');
      }
    } catch {
      setGrantMsg('Request failed');
      setGrantState('error');
    }
  }, [id, grantDays, grantState]);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else setData(d);
      })
      .catch(() => setErr('Failed to load user'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={s.loading}>Loading…</div>;
  if (err) return <div className={s.loading}>Error: {err}</div>;
  if (!data) return null;

  const { user, setting, recentLogs, logsCount, tickets, cases } = data;

  return (
    <>
      <Link href="/admin/users" className={s.back}>← Back to users</Link>

      <div className={s.grid}>
        {/* Left column: activity + support */}
        <div className={s.leftCol}>

          {/* Workout activity */}
          <div className={s.card}>
            <div className={s.cardTitle}>Workout Activity</div>
            <div className={s.statRow}>
              <span className={s.statLabel}>Total log entries</span>
              <span className={s.statVal}>{logsCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Recent app events */}
          {recentLogs.length > 0 && (
            <div className={s.card}>
              <div className={s.cardTitle}>Recent Events</div>
              <div className={s.logList}>
                {recentLogs.map((l) => (
                  <div key={l.id} className={s.logItem}>
                    <span className={`${s.logLevel} ${l.level === 'error' ? s.logError : l.level === 'warn' ? s.logWarn : s.logInfo}`}>
                      {l.level}
                    </span>
                    <span className={s.logEvent}>{l.event}</span>
                    <span className={s.logTs}>{fmtDateTime(l.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Support tickets */}
          {tickets.length > 0 && (
            <div className={s.card}>
              <div className={s.cardTitle}>Support Tickets ({tickets.length})</div>
              <div className={s.linkList}>
                {tickets.map((t) => (
                  <Link key={t.id} href={`/admin/ticket/${t.id}`} className={s.linkItem}>
                    <span className={s.linkSubject}>{t.subject}</span>
                    <span className={s.linkMeta}>
                      <span className={`${s.badge} ${ticketStatusClass(t.status)}`}>{t.status}</span>
                      <span className={s.linkDate}>{fmtDate(t.receivedAt)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Support cases */}
          {cases.length > 0 && (
            <div className={s.card}>
              <div className={s.cardTitle}>Support Cases ({cases.length})</div>
              <div className={s.linkList}>
                {cases.map((c) => (
                  <Link key={c.id} href={`/admin/cases/${c.id}`} className={s.linkItem}>
                    <span className={s.linkSubject}>{c.title}</span>
                    <span className={s.linkMeta}>
                      <span className={`${s.badge} ${caseStatusClass(c.status)}`}>{c.status}</span>
                      <span className={s.linkDate}>{fmtDate(c.createdAt)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {tickets.length === 0 && cases.length === 0 && (
            <div className={s.card}>
              <div className={s.cardTitle}>Support History</div>
              <div className={s.empty}>No tickets or cases for this user.</div>
            </div>
          )}
        </div>

        {/* Right column: user panel */}
        <div className={s.rightCol}>
          <div className={s.panel}>
            <div className={s.panelTitle}>Account</div>

            <div className={s.userName}>{user.name}</div>
            <div className={s.userEmail}>{user.email}</div>

            <div className={s.infoRow}>
              <span className={s.infoKey}>Status</span>
              <span className={`${s.migBadge} ${migrationClass(user.migrationType)}`}>
                {user.migrationType?.replace(/_/g, ' ') ?? 'unknown'}
              </span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoKey}>Member since</span>
              <span className={s.infoVal}>{fmtDate(user.createdAt)}</span>
            </div>
            <div className={s.infoRow}>
              <span className={s.infoKey}>User ID</span>
              <span className={s.infoId}>{user.id}</span>
            </div>

            {/* Password reset */}
            <div className={s.actionRow}>
              <button
                className={`${s.actionBtn} ${resetState === 'ok' ? s.actionOk : resetState === 'error' ? s.actionErr : ''}`}
                onClick={handlePasswordReset}
                disabled={resetState === 'loading' || resetState === 'ok'}
              >
                {resetState === 'loading' ? 'Sending…'
                  : resetState === 'ok'   ? '✓ Reset email sent'
                  : resetState === 'error' ? '✗ Failed — retry?'
                  : 'Send password reset'}
              </button>
            </div>

            <div className={s.panelDivider} />
            <div className={s.panelSubTitle}>Access</div>

            {setting && (
              <>
                {setting.status && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Status</span>
                    <span className={s.infoVal}>{setting.status}</span>
                  </div>
                )}
                {setting.trial && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Trial</span>
                    <span className={s.infoVal}>
                      {setting.trialEndDate ? `ends ${fmtDate(setting.trialEndDate)}` : 'active'}
                    </span>
                  </div>
                )}
                {setting.stripeSubscriptionId && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Stripe sub</span>
                    <a
                      href={`https://dashboard.stripe.com/subscriptions/${setting.stripeSubscriptionId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.stripeLink}
                    >
                      {setting.stripeSubscriptionId}
                    </a>
                  </div>
                )}
                {setting.stripeCustomerId && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Stripe customer</span>
                    <a
                      href={`https://dashboard.stripe.com/customers/${setting.stripeCustomerId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={s.stripeLink}
                    >
                      {setting.stripeCustomerId}
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Contextual access action — always visible for non-Stripe users */}
            {setting?.stripeSubscriptionId ? (
                  <div className={s.actionRow}>
                    <button
                      className={`${s.actionBtn} ${s.actionOrange} ${extendState === 'ok' ? s.actionOk : extendState === 'error' ? s.actionErr : ''}`}
                      onClick={handleExtendSubscription}
                      disabled={extendState === 'loading' || extendState === 'ok'}
                    >
                      {extendState === 'loading' ? 'Extending…'
                        : extendState === 'ok'    ? '✓ Extended'
                        : extendState === 'error' ? '✗ Failed — retry?'
                        : 'Extend subscription +30 days'}
                    </button>
                    {extendMsg && (
                      <div className={`${s.actionMsg} ${extendState === 'ok' ? s.actionOk : s.actionErr}`}>
                        {extendMsg}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={s.actionRow}>
                    <div className={s.grantRow}>
                      <select
                        className={s.durationSelect}
                        value={grantDays}
                        onChange={(e) => setGrantDays(e.target.value)}
                        disabled={grantState === 'loading' || grantState === 'ok'}
                      >
                        <option value="30">30 days</option>
                        <option value="60">60 days</option>
                        <option value="90">90 days</option>
                        <option value="365">1 year</option>
                        <option value="indefinite">Indefinite</option>
                      </select>
                      <button
                        className={`${s.actionBtn} ${s.actionOrange} ${s.grantBtn} ${grantState === 'ok' ? s.actionOk : grantState === 'error' ? s.actionErr : ''}`}
                        onClick={handleGrantAccess}
                        disabled={grantState === 'loading' || grantState === 'ok'}
                      >
                        {grantState === 'loading' ? 'Granting…'
                          : grantState === 'ok'    ? '✓ Access granted'
                          : grantState === 'error' ? '✗ Failed — retry?'
                          : 'Grant free access'}
                      </button>
                    </div>
                    {grantMsg && (
                      <div className={`${s.actionMsg} ${grantState === 'ok' ? s.actionOk : s.actionErr}`}>
                        {grantMsg}
                      </div>
                    )}
                  </div>
                )}
          </div>
        </div>
      </div>
    </>
  );
}
