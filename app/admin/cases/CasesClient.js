'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import s from './cases.module.css';

const TABS = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'Pending', value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

function statusClass(status) {
  if (status === 'pending') return s.statusPending;
  if (status === 'resolved') return s.statusResolved;
  if (status === 'closed') return s.statusClosed;
  return s.statusOpen;
}

function priorityClass(priority) {
  if (priority === 'urgent') return s.priorityUrgent;
  if (priority === 'high') return s.priorityHigh;
  if (priority === 'low') return s.priorityLow;
  return s.priorityNormal;
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CasesClient() {
  const [tab, setTab] = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const url = `/api/admin/cases${tab ? `?status=${tab}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCases(data.cases ?? []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className={s.header}>
        <div className={s.title}>Support Cases</div>
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

      {err ? (
        <div className={s.empty}>Error: {err}</div>
      ) : loading ? (
        <div className={s.empty}>Loading…</div>
      ) : cases.length === 0 ? (
        <div className={s.empty}>No cases{tab ? ` with status "${tab}"` : ''}.</div>
      ) : (
        <div className={s.list}>
          {cases.map((c) => (
            <Link key={c.id} href={`/admin/cases/${c.id}`} className={s.row}>
              <span className={s.rowTitle}>{c.title}</span>
              <span className={s.rowCustomer}>
                <span className={s.rowName}>{c.userName || c.fromName || c.fromEmail}</span>
                {c.userEmail && c.userEmail !== c.fromEmail && (
                  <span className={s.rowEmail}>{c.userEmail}</span>
                )}
                {!c.userName && !c.userEmail && (
                  <span className={s.rowEmail}>{c.fromEmail}</span>
                )}
              </span>
              <span className={s.rowDate}>{fmtDate(c.createdAt)}</span>
              <span className={`${s.badge} ${statusClass(c.status)}`}>{c.status}</span>
              <span className={`${s.badge} ${priorityClass(c.priority)}`}>{c.priority}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
