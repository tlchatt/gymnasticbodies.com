'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Badge, Tabs, PageHeader, CtaButton } from '@/components/ui';
import s from './inbox.module.css';

const STATUS_TABS = [
  { label: 'All',     value: '' },
  { label: 'Open',    value: 'open' },
  { label: 'Replied', value: 'replied' },
  { label: 'Closed',  value: 'closed' },
];

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function InboxClient() {
  const [tab,     setTab]     = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/tickets${tab ? `?status=${tab}` : ''}`;
      const res  = await fetch(url);
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
      const res  = await fetch('/api/admin/gmail/sync', { method: 'POST' });
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
      <PageHeader title="Support Inbox">
        {syncMsg && <span className={s.syncMsg}>{syncMsg}</span>}
        <CtaButton size="sm" onClick={syncGmail} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync Gmail'}
        </CtaButton>
      </PageHeader>

      <Tabs tabs={STATUS_TABS} value={tab} onChange={setTab} />

      {loading ? (
        <div className={s.empty}>Loading…</div>
      ) : tickets.length === 0 ? (
        <div className={s.empty}>No tickets{tab ? ` with status "${tab}"` : ''}.</div>
      ) : (
        <div className={s.list}>
          {tickets.map((t) => (
            <Link key={t.id} href={`/admin/ticket/${t.id}`} className={s.row}>
              <span className={s.sender}>{t.fromName || t.fromEmail}</span>

              <span className={s.subjectCell}>
                <span className={s.subjectText}>{t.subject}</span>
                {t.caseId && (
                  <Link
                    href={`/admin/cases/${t.caseId}`}
                    className={s.caseBadgeLink}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Badge variant="case">Case</Badge>
                  </Link>
                )}
              </span>

              <span className={s.date}>{fmtDate(t.receivedAt)}</span>

              <Badge variant={t.status}>{t.status}</Badge>

              {t.migrationType ? (
                <Badge variant={t.migrationType}>
                  {t.migrationType.replace(/_/g, ' ')}
                </Badge>
              ) : (
                <span title="No account found" className={s.noAccountDot} />
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
