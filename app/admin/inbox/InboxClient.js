'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import s from './inbox.module.css';

const TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Replied', value: 'replied' },
  { label: 'Closed', value: 'closed' },
];

function statusClass(status) {
  if (status === 'replied') return s.badgeReplied;
  if (status === 'closed') return s.badgeClosed;
  return s.badgeOpen;
}

function migrationClass(type) {
  if (type === 'stripe') return s.badgeStripe;
  if (type === 'active_current') return s.badgeActiveCurrent;
  if (type === 'active_expired') return s.badgeActiveExpired;
  if (type === 'inactive') return s.badgeInactive;
  return s.badgeUnknown;
}

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InboxClient() {
  const [tab, setTab] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/tickets${tab ? `?status=${tab}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function syncGmail() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/admin/gmail/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(`Synced: ${data.inserted ?? 0} new, ${data.skipped ?? 0} already seen`);
      load();
    } catch {
      setSyncMsg('Sync failed — check console');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <div className={s.header}>
        <div className={s.title}>Support Inbox</div>
        <div className={s.actions}>
          {syncMsg && <span className={s.syncMsg}>{syncMsg}</span>}
          <button className={s.syncBtn} onClick={syncGmail} disabled={syncing}>
            {syncing ? 'Syncing…' : 'Sync Gmail'}
          </button>
        </div>
      </div>

      <div className={s.tabs}>
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`${s.tab}${tab === t.value ? ` ${s.activeTab}` : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={s.empty}>Loading…</div>
      ) : tickets.length === 0 ? (
        <div className={s.empty}>No tickets{tab ? ` with status "${tab}"` : ''}.</div>
      ) : (
        <div className={s.list}>
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/ticket/${t.id}`} className={s.row}>
              <span className={s.sender}>{t.fromName || t.fromEmail}</span>
              <span className={s.subject}>{t.subject}</span>
              <span className={s.date}>{fmtDate(t.receivedAt)}</span>
              <span className={`${s.badge} ${statusClass(t.status)}`}>{t.status}</span>
              {t.migrationType ? (
                <span className={`${s.badge} ${migrationClass(t.migrationType)}`}>
                  {t.migrationType.replace('_', ' ')}
                </span>
              ) : (
                <span title="No account found" className={`${s.userDot} ${s.userDotMissing}`} />
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
