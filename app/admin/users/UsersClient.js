'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import s from './users.module.css';

const MIGRATION_LABELS = {
  stripe:             'Stripe',
  auth_net_subscriber:'Auth.net',
  active_current:     'Active',
  active_expired:     'Expired',
  inactive:           'Inactive',
};

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

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? '??';
}

export default function UsersClient() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const debounceRef = useRef(null);

  const load = useCallback(async (query) => {
    setLoading(true);
    setErr('');
    try {
      const url = `/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => { load(debouncedQ); }, [debouncedQ, load]);

  return (
    <>
      <div className={s.header}>
        <div className={s.titleRow}>
          <div className={s.title}>Users</div>
          {total !== null && !loading && (
            <span className={s.count}>{total.toLocaleString()} result{total !== 1 ? 's' : ''}</span>
          )}
        </div>
        <div className={s.searchWrap}>
          <input
            className={s.search}
            type="text"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
          {q && (
            <button className={s.clearBtn} onClick={() => setQ('')} aria-label="Clear search">×</button>
          )}
        </div>
      </div>

      {err ? (
        <div className={s.empty}>Error: {err}</div>
      ) : loading ? (
        <div className={s.empty}>Loading…</div>
      ) : users.length === 0 ? (
        <div className={s.empty}>{debouncedQ ? `No users matching "${debouncedQ}".` : 'No users found.'}</div>
      ) : (
        <>
          <div className={s.tableHead}>
            <span>User</span>
            <span>Email</span>
            <span>Status</span>
            <span>Sub</span>
            <span>Joined</span>
          </div>
          <div className={s.list}>
            {users.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className={s.row}>
                <span className={s.avatarCell}>
                  <span className={s.avatar}>{initials(u.name, u.email)}</span>
                  <span className={s.name}>{u.name || '—'}</span>
                </span>
                <span className={s.email}>{u.email}</span>
                <span className={`${s.migBadge} ${migrationClass(u.migrationType)}`}>
                  {MIGRATION_LABELS[u.migrationType] ?? u.migrationType ?? 'unknown'}
                </span>
                <span className={s.subStatus}>
                  {u.settingStatus
                    ? <span className={u.settingStatus === 'active' ? s.subActive : s.subInactive}>{u.settingStatus}</span>
                    : <span className={s.subNone}>—</span>
                  }
                  {u.trial && <span className={s.trialBadge}>trial</span>}
                </span>
                <span className={s.date}>{fmtDate(u.createdAt)}</span>
              </Link>
            ))}
          </div>
          {total >= 200 && (
            <div className={s.limitNote}>Showing first 200 results — refine your search to narrow down.</div>
          )}
        </>
      )}
    </>
  );
}
