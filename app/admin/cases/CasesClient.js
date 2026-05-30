'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Badge, Tabs, PageHeader } from '@/components/ui';
import s from './cases.module.css';

const TABS = [
  { label: 'All',      value: '' },
  { label: 'Open',     value: 'open' },
  { label: 'Pending',  value: 'pending' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed',   value: 'closed' },
];

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function CasesClient() {
  const [tab,   setTab]   = useState('');
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const url  = `/api/admin/cases${tab ? `?status=${tab}` : ''}`;
      const res  = await fetch(url);
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
      <PageHeader title="Support Cases" />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

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
              <Badge variant={c.status}>{c.status}</Badge>
              <Badge variant={c.priority}>{c.priority}</Badge>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
