'use client';
import { use, useState, useEffect } from 'react';
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
    stripe:             s.migStripe,
    auth_net_subscriber:s.migAuthNet,
    active_current:     s.migActiveCurrent,
    active_expired:     s.migActiveExpired,
    inactive:           s.migInactive,
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

            {setting && (
              <>
                <div className={s.panelDivider} />
                <div className={s.panelSubTitle}>Subscription</div>

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
          </div>
        </div>
      </div>
    </>
  );
}
