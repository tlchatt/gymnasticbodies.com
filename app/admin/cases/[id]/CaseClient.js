'use client';
import { useState } from 'react';
import Link from 'next/link';
import AccountHistory from '@/components/admin/AccountHistory';
import SubscriptionActions from '@/components/admin/SubscriptionActions';
import SubscriptionSummary from '@/components/admin/SubscriptionSummary';
import s from './case.module.css';

function EmailThread({ email }) {
  const [open, setOpen] = useState(false);
  const hasReplies = email.replies?.length > 0;

  return (
    <div className={`${s.emailItem} ${open ? s.emailItemOpen : ''}`}>
      <button className={s.emailHeader} onClick={() => setOpen(o => !o)}>
        <span className={s.emailChevron}>{open ? '▾' : '▸'}</span>
        <span className={s.emailSubject}>{email.subject}</span>
        {hasReplies && (
          <span className={s.replyCount}>↩ {email.replies.length}</span>
        )}
        <span className={s.emailDate}>{fmtDate(email.receivedAt)}</span>
        <span className={`${s.emailStatus} ${email.status === 'replied' ? s.emailStatusReplied : ''}`}>
          {email.status}
        </span>
      </button>

      {open && (
        <div className={s.emailBody}>
          <div className={s.emailMeta}>From: {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}</div>
          <pre className={s.emailText}>{email.body || '(no body)'}</pre>

          {hasReplies && (
            <div className={s.replyThread}>
              {email.replies.map(r => (
                <div key={r.id} className={s.replyItem}>
                  <div className={s.replyMeta}>↩ Admin reply · {fmtDateTime(r.sentAt)}</div>
                  <pre className={s.replyText}>{r.body}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(str) {
  if (!str) return '';
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

function statusClass(status) {
  if (status === 'pending') return s.statusPending;
  if (status === 'resolved') return s.statusResolved;
  if (status === 'closed') return s.statusClosed;
  return s.statusOpen;
}

const ACT_BTN = {
  fontSize: 12,
  padding: '6px 10px',
  background: 'var(--bg-raised)',
  border: '1px solid var(--border-subtle)',
  color: 'var(--text-muted)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
};

export default function CaseClient({ data: initial }) {
  const [caseData, setCaseData] = useState(initial.case);
  const [notes, setNotes] = useState(initial.case.adminNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [tempPwState, setTempPwState] = useState('idle');
  const [tempPw, setTempPw] = useState('');
  const [resetState, setResetState] = useState('idle');
  const [extendState, setExtendState] = useState('idle');
  const [extendMsg, setExtendMsg] = useState('');
  const [grantState, setGrantState] = useState('idle');
  const [grantMsg, setGrantMsg] = useState('');
  const [grantDays, setGrantDays] = useState('30');

  const user = initial.user;
  const setting = initial.setting;
  const lastSession = initial.lastSession;
  const subscription = initial.subscription ?? null;
  const recentLogs = initial.recentLogs ?? [];
  const adminActions = initial.adminActions ?? [];
  const outbound = initial.outbound ?? [];
  const pastCases = initial.pastCases ?? [];
  const linkedEmails = initial.linkedEmails ?? [];

  async function handleSetTempPassword() {
    if (!user?.id || tempPwState === 'loading') return;
    setTempPwState('loading');
    setTempPw('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}/set-temp-password`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) { setTempPw(json.tempPassword); setTempPwState('ok'); }
      else setTempPwState('error');
    } catch { setTempPwState('error'); }
  }

  async function handlePasswordReset() {
    if (!user?.id || resetState === 'loading') return;
    setResetState('loading');
    try {
      const res = await fetch(`/api/admin/users/${user.id}/send-password-reset`, { method: 'POST' });
      const json = await res.json();
      setResetState(json.ok ? 'ok' : 'error');
    } catch { setResetState('error'); }
  }

  // Stripe subscriber: extend via Stripe trial_end / period (+30 days)
  async function handleExtendSubscription() {
    if (!user?.id || extendState === 'loading') return;
    setExtendState('loading');
    setExtendMsg('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}/extend-subscription`, { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        const dateStr = json.newPeriodEnd ?? json.newRenewalDate;
        const label = dateStr ? ` · renews ${fmtDate(dateStr)}` : '';
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
  }

  // Non-Stripe: grant free access via migration_type + renewaldate
  async function handleGrantAccess() {
    if (!user?.id || grantState === 'loading') return;
    setGrantState('loading');
    setGrantMsg('');
    try {
      const res = await fetch(`/api/admin/users/${user.id}/grant-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: grantDays === 'indefinite' ? 'indefinite' : parseInt(grantDays) }),
      });
      const json = await res.json();
      if (json.ok) {
        const label = grantDays === 'indefinite'
          ? 'Indefinite access granted'
          : `Access granted · expires ${fmtDate(json.expiresAt)}`;
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
  }

  async function patchCase(updates) {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`/api/admin/cases/${caseData.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) { setSaveMsg(data.error ?? 'Save failed'); return; }
      setCaseData(data.case);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch {
      setSaveMsg('Network error');
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    patchCase({
      status: caseData.status,
      priority: caseData.priority,
      adminNotes: notes,
    });
  }

  function handleNotesBlur() {
    if (notes !== (initial.case.adminNotes ?? '')) {
      patchCase({ adminNotes: notes });
    }
  }

  return (
    <>
      <Link href="/admin/cases" className={s.back}>← Back to cases</Link>

      <div className={s.grid}>
        {/* Left column */}
        <div>
          {/* Case header card */}
          <div className={s.card}>
            <div className={s.cardHeader}>
              <div className={s.caseTitle}>{caseData.title}</div>
              <div className={s.controlRow}>
                <span className={s.controlLabel}>Status</span>
                <select
                  className={s.select}
                  value={caseData.status}
                  onChange={(e) => setCaseData((c) => ({ ...c, status: e.target.value }))}
                >
                  <option value="open">Open</option>
                  <option value="reopened">Reopened (replied)</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <span className={s.controlLabel}>Priority</span>
                <select
                  className={s.select}
                  value={caseData.priority}
                  onChange={(e) => setCaseData((c) => ({ ...c, priority: e.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>

                <button className={s.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                {saveMsg && <span className={s.saveMsg}>{saveMsg}</span>}
              </div>
            </div>

            {/* Admin notes */}
            <div className={s.section}>
              <div className={s.sectionTitle}>Admin Notes</div>
              <textarea
                className={s.notesTextarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Internal notes about this case…"
              />
            </div>
          </div>

          {/* Linked emails */}
          <div className={s.card}>
            <div className={s.section} style={{ borderTop: 'none' }}>
              <div className={s.sectionTitle}>
                Linked Emails ({linkedEmails.length})
              </div>
              {linkedEmails.length === 0 ? (
                <div className={s.noEmails}>No emails linked to this case.</div>
              ) : (
                <div className={s.emailList}>
                  {linkedEmails.map((e) => (
                    <EmailThread key={e.id} email={e} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column: user panel */}
        <div>
          <div className={s.panel}>
            <div className={s.panelTitle}>Customer</div>

            {!user ? (
              <div className={s.noUser}>
                {caseData.fromName ? `${caseData.fromName} (${caseData.fromEmail})` : caseData.fromEmail}
                <br />No linked account.
              </div>
            ) : (
              <>
                <div className={s.userInfo}>
                  <Link href={`/admin/users/${user.id}`} className={s.userName} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                    {user.name}
                    <span style={{ color: 'var(--accent)', fontSize: '0.8em' }}>→</span>
                  </Link>
                  <div className={s.userEmail}>{user.email}</div>
                  <Link href={`/admin/users/${user.id}`} className={s.profileLink}>
                    View full profile →
                  </Link>

                  {/* Admin actions — same set as the user detail page, logged to app_logs per action */}
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button onClick={handlePasswordReset} disabled={resetState === 'loading' || resetState === 'ok'} style={ACT_BTN}>
                      {resetState === 'loading' ? 'Sending…'
                        : resetState === 'ok'    ? '✓ Reset email sent'
                        : resetState === 'error' ? '✗ Failed — retry?'
                        : 'Send password reset'}
                    </button>

                    <button onClick={handleSetTempPassword} disabled={tempPwState === 'loading'} style={ACT_BTN}>
                      {tempPwState === 'loading' ? 'Setting…'
                        : tempPwState === 'error' ? '✗ Failed — retry?'
                        : 'Set temp password'}
                    </button>
                    {tempPw && (
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: 'var(--text-subtle)' }}>Temp: </span>
                        <code style={{ color: 'var(--accent)', fontFamily: 'monospace', userSelect: 'all' }}>{tempPw}</code>
                      </div>
                    )}

                    {setting?.stripeSubscriptionId ? (
                      <>
                        <button onClick={handleExtendSubscription} disabled={extendState === 'loading' || extendState === 'ok'} style={{ ...ACT_BTN, borderColor: 'var(--border-accent)' }}>
                          {extendState === 'loading' ? 'Extending…'
                            : extendState === 'ok'    ? '✓ Extended'
                            : extendState === 'error' ? '✗ Failed — retry?'
                            : 'Extend subscription +30 days'}
                        </button>
                        {extendMsg && <div style={{ fontSize: 11, color: extendState === 'ok' ? 'var(--accent-light)' : '#e66' }}>{extendMsg}</div>}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <select value={grantDays} onChange={(e) => setGrantDays(e.target.value)} disabled={grantState === 'loading' || grantState === 'ok'} style={{ ...ACT_BTN, width: 'auto', flex: '0 0 auto' }}>
                            <option value="30">30 days</option>
                            <option value="60">60 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                            <option value="indefinite">Indefinite</option>
                          </select>
                          <button onClick={handleGrantAccess} disabled={grantState === 'loading' || grantState === 'ok'} style={{ ...ACT_BTN, borderColor: 'var(--border-accent)', flex: 1 }}>
                            {grantState === 'loading' ? 'Granting…'
                              : grantState === 'ok'    ? '✓ Access granted'
                              : grantState === 'error' ? '✗ Failed — retry?'
                              : 'Grant free access'}
                          </button>
                        </div>
                        {grantMsg && <div style={{ fontSize: 11, color: grantState === 'ok' ? 'var(--accent-light)' : '#e66' }}>{grantMsg}</div>}
                      </>
                    )}

                    <SubscriptionActions userId={user.id} hasStripeSub={!!setting?.stripeSubscriptionId} />
                  </div>

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
                  {lastSession && (
                    <div className={s.infoRow}>
                      <span className={s.infoKey}>Last active</span>
                      <span className={s.infoVal}>{fmtDate(lastSession)}</span>
                    </div>
                  )}
                </div>

                {/* Subscription */}
                {(subscription || setting) && (
                  <div className={s.panelSection}>
                    <SubscriptionSummary subscription={subscription} setting={setting} />
                  </div>
                )}

                {/* Admin actions + outreach history (subscription grants, resets, marketing offers) */}
                <div className={s.panelSection}>
                  <AccountHistory adminActions={adminActions} outbound={outbound} />
                </div>

                {/* Recent app activity (logins, renewal checks) */}
                {recentLogs.length > 0 && (
                  <div className={s.panelSection}>
                    <div className={s.panelSectionTitle}>Recent Activity</div>
                    {recentLogs.map((l) => (
                      <div key={l.id} className={s.logItem}>
                        <span className={s.logEvent}>{l.event}</span>
                        <span className={s.logTs}>{fmtDate(l.ts)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Past cases */}
                {pastCases.length > 0 && (
                  <div className={s.panelSection}>
                    <div className={s.panelSectionTitle}>Past Cases ({pastCases.length})</div>
                    {pastCases.map((c) => (
                      <Link key={c.id} href={`/admin/cases/${c.id}`} className={s.pastCaseItem}>
                        <span className={s.pastCaseTitle}>{c.title}</span>
                        <span className={`${s.badge} ${statusClass(c.status)}`}>{c.status}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Notes auto-save on right panel */}
            <div className={s.panelSection}>
              <div className={s.panelSectionTitle}>Notes</div>
              <textarea
                className={s.notesSmall}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Internal notes…"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
