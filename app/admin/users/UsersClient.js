'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import s from './users.module.css';

const MIGRATION_LABELS = {
  current:            'Current',
  noncurrent:         'Non-Current',
  stripe:             'Stripe',
  auth_net:           'Auth.net',
  subscriber:         'Subscriber',
  purchased:          'Purchased',
  lapsed:             'Lapsed',
  inactive:           'Inactive',
  // legacy
  auth_net_subscriber:'Auth.net',
  active_current:     'Current',
  active_expired:     'Non-Current',
};

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

const SEGMENTS = [
  { value: 'stripe',     label: 'Stripe' },
  { value: 'auth_net',   label: 'Auth.net' },
  { value: 'subscriber', label: 'Subscriber' },
  { value: 'purchased',  label: 'Purchased' },
  { value: 'lapsed',     label: 'Lapsed' },
  { value: 'inactive',   label: 'Inactive' },
];

export default function UsersClient() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [migration, setMigration] = useState('');
  const [segment, setSegment] = useState('');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const debounceRef = useRef(null);

  // Create free user form
  const [showCreate, setShowCreate]     = useState(false);
  const [createName, setCreateName]     = useState('');
  const [createEmail, setCreateEmail]   = useState('');
  const [createDays, setCreateDays]     = useState('30');
  const [createState, setCreateState]   = useState('idle'); // idle | loading | ok | error
  const [createMsg, setCreateMsg]       = useState('');
  const [createdUserId, setCreatedUserId] = useState(null);

  const load = useCallback(async (query, mig, seg) => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (mig)   params.set('migration', mig);
      if (seg)   params.set('segment', seg);
      const url = `/api/admin/users${params.toString() ? `?${params}` : ''}`;
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

  const handleCreate = useCallback(async (e) => {
    e.preventDefault();
    if (createState === 'loading') return;
    setCreateState('loading');
    setCreateMsg('');
    setCreatedUserId(null);
    try {
      const res = await fetch('/api/admin/users/create-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          email: createEmail.trim(),
          days: createDays === 'indefinite' ? 'indefinite' : parseInt(createDays),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        const durationLabel = createDays === 'indefinite' ? 'indefinite access' : `${createDays}-day access`;
        setCreateMsg(`✓ ${json.isNew ? 'Created' : 'Updated'} — ${durationLabel} granted. ${json.isNew ? 'Reset email sent.' : ''}`);
        setCreatedUserId(json.userId);
        setCreateState('ok');
        setCreateName('');
        setCreateEmail('');
        load(debouncedQ); // Refresh list
      } else {
        setCreateMsg(json.error ?? 'Failed');
        setCreateState('error');
      }
    } catch {
      setCreateMsg('Request failed');
      setCreateState('error');
    }
  }, [createName, createEmail, createDays, createState, debouncedQ, load]);

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => { load(debouncedQ, migration, segment); }, [debouncedQ, migration, segment, load]);

  return (
    <>
      <div className={s.header}>
        <div className={s.titleRow}>
          <div className={s.title}>Users</div>
          {total !== null && !loading && (
            <span className={s.count}>{total.toLocaleString()} result{total !== 1 ? 's' : ''}</span>
          )}
          <button
            className={`${s.createToggle} ${showCreate ? s.createToggleActive : ''}`}
            onClick={() => { setShowCreate((v) => !v); setCreateState('idle'); setCreateMsg(''); setCreatedUserId(null); }}
          >
            {showCreate ? '✕ Cancel' : '+ Create free user'}
          </button>
        </div>

        {showCreate && (
          <form className={s.createForm} onSubmit={handleCreate}>
            <div className={s.createFields}>
              <input
                className={s.createInput}
                type="text"
                placeholder="Full name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                required
                disabled={createState === 'loading'}
              />
              <input
                className={s.createInput}
                type="email"
                placeholder="Email address"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
                disabled={createState === 'loading'}
              />
              <select
                className={s.createSelect}
                value={createDays}
                onChange={(e) => setCreateDays(e.target.value)}
                disabled={createState === 'loading'}
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="indefinite">Indefinite</option>
              </select>
              <button
                type="submit"
                className={s.createBtn}
                disabled={createState === 'loading'}
              >
                {createState === 'loading' ? 'Creating…' : 'Create'}
              </button>
            </div>
            {createMsg && (
              <div className={`${s.createMsg} ${createState === 'ok' ? s.createOk : s.createErr}`}>
                {createMsg}
                {createdUserId && createState === 'ok' && (
                  <a href={`/admin/users/${createdUserId}`} className={s.createProfileLink}>View profile →</a>
                )}
              </div>
            )}
          </form>
        )}

        <div className={s.filterRow}>
          <select
            className={s.migSelect}
            value={migration}
            onChange={e => { setMigration(e.target.value); setSegment(''); }}
          >
            <option value="">All users</option>
            <option value="current">Current</option>
            <option value="noncurrent">Non-Current</option>
          </select>

          <div className={s.chips}>
            {SEGMENTS.map(seg => (
              <button
                key={seg.value}
                className={`${s.chip} ${segment === seg.value ? s.chipActive : ''}`}
                onClick={() => setSegment(s => s === seg.value ? '' : seg.value)}
              >
                {seg.label}
              </button>
            ))}
          </div>
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
                <span className={`${s.migBadge} ${migrationClass(u.customerSegment || u.migrationType)}`}>
                  {MIGRATION_LABELS[u.customerSegment] ?? MIGRATION_LABELS[u.migrationType] ?? u.migrationType ?? 'unknown'}
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
