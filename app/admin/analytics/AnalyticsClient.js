'use client';
import { useState, useEffect } from 'react';
import s from './analytics.module.css';

const PERIODS = [
  { label: '30 days', key: '30d' },
  { label: '7 days',  key: '7d'  },
  { label: '24 hours', key: '1d' },
];

const MIGRATION_COLORS = {
  stripe:             { bg: 'rgba(99, 91, 255, 0.15)',  text: '#9b94ff' },
  auth_net_subscriber:{ bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24' },
  active_current:     { bg: 'rgba(80, 200, 120, 0.12)', text: '#50c878' },
  active_expired:     { bg: 'rgba(240, 86, 33, 0.15)',  text: '#f05621' },
  inactive:           { bg: 'rgba(120, 120, 120, 0.15)', text: '#888' },
};

const MIGRATION_LABELS = {
  stripe:             'Stripe Active',
  auth_net_subscriber:'Auth.net Active',
  active_current:     'Active (no Stripe)',
  active_expired:     'Expired (paywall)',
  inactive:           'Inactive',
  unknown:            'Unknown',
};

function pct(num, den) {
  if (!den) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

function fmtDateTime(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function FunnelBar({ label, value, max, color }) {
  const pctWidth = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={s.funnelRow}>
      <div className={s.funnelLabel}>{label}</div>
      <div className={s.funnelBarWrap}>
        <div className={s.funnelBarTrack}>
          <div className={s.funnelBarFill} style={{ width: `${pctWidth}%`, background: color }} />
        </div>
        <span className={s.funnelCount}>{value.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function AnalyticsClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else setData(d);
      })
      .catch(() => setErr('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const funnel = data?.funnel?.[period] ?? null;
  const totalUsers = data?.userBreakdown?.reduce((sum, r) => sum + r.count, 0) ?? 0;

  return (
    <>
      <div className={s.header}>
        <div className={s.title}>Analytics</div>
      </div>

      {loading ? (
        <div className={s.empty}>Loading…</div>
      ) : err ? (
        <div className={s.empty}>Error: {err}</div>
      ) : (
        <div className={s.body}>

          {/* User breakdown */}
          <section className={s.section}>
            <div className={s.sectionTitle}>Users by Status</div>
            <div className={s.statGrid}>
              {(data.userBreakdown ?? []).map((row) => {
                const style = MIGRATION_COLORS[row.migrationType] ?? { bg: 'rgba(120,120,120,0.1)', text: '#666' };
                return (
                  <div key={row.migrationType} className={s.statCard} style={{ '--card-bg': style.bg, '--card-color': style.text }}>
                    <div className={s.statCardCount}>{row.count.toLocaleString()}</div>
                    <div className={s.statCardLabel}>
                      {MIGRATION_LABELS[row.migrationType] ?? row.migrationType}
                    </div>
                    <div className={s.statCardPct}>{pct(row.count, totalUsers)} of total</div>
                  </div>
                );
              })}
              <div className={s.statCard} style={{ '--card-bg': 'rgba(255,255,255,0.04)', '--card-color': '#fff' }}>
                <div className={s.statCardCount}>{totalUsers.toLocaleString()}</div>
                <div className={s.statCardLabel}>Total Users</div>
              </div>
            </div>
          </section>

          {/* Renewal funnel */}
          <section className={s.section}>
            <div className={s.sectionHeader}>
              <div className={s.sectionTitle}>Renewal Funnel</div>
              <div className={s.tabs}>
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    className={`${s.tab} ${period === p.key ? s.activeTab : ''}`}
                    onClick={() => setPeriod(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {funnel && (
              <div className={s.funnelCard}>
                <FunnelBar label="Page Views"   value={funnel.pageViews}   max={funnel.pageViews} color="#555" />
                <FunnelBar label="Form Submits" value={funnel.formSubmits} max={funnel.pageViews} color="#f05621" />
                <FunnelBar label="Card Errors"  value={funnel.cardErrors}  max={funnel.pageViews} color="#ef4444" />
                <FunnelBar label="Successes"    value={funnel.successes}   max={funnel.pageViews} color="#50c878" />

                <div className={s.conversionRow}>
                  <div className={s.conversionStat}>
                    <span className={s.conversionLabel}>Submit rate</span>
                    <span className={s.conversionValue}>{pct(funnel.formSubmits, funnel.pageViews)}</span>
                  </div>
                  <div className={s.conversionStat}>
                    <span className={s.conversionLabel}>Error rate</span>
                    <span className={s.conversionValue} style={{ color: funnel.cardErrors > 0 ? '#ef4444' : '#50c878' }}>
                      {pct(funnel.cardErrors, funnel.formSubmits)}
                    </span>
                  </div>
                  <div className={s.conversionStat}>
                    <span className={s.conversionLabel}>Conversion</span>
                    <span className={s.conversionValue} style={{ color: '#50c878' }}>
                      {pct(funnel.successes, funnel.pageViews)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Recent conversions */}
          {(data.recentConversions?.length > 0) && (
            <section className={s.section}>
              <div className={s.sectionTitle}>Recent Renewals</div>
              <div className={s.conversionList}>
                {data.recentConversions.map((r) => (
                  <div key={r.id} className={s.conversionItem}>
                    <span className={s.convEmail}>{r.email ?? '—'}</span>
                    <span className={s.convTs}>{fmtDateTime(r.ts)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(!data.recentConversions?.length) && (
            <section className={s.section}>
              <div className={s.sectionTitle}>Recent Renewals</div>
              <div className={s.empty}>No renewal.success events logged yet.</div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
