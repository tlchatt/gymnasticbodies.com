'use client';
import { useState, useCallback } from 'react';
import Link from 'next/link';
import s from './case.module.css';

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
    stripe: s.migStripe,
    auth_net_subscriber: s.migAuthNet,
    active_current: s.migActiveCurrent,
    active_expired: s.migActiveExpired,
    inactive: s.migInactive,
  };
  return map[type] ?? s.migUnknown;
}

function statusClass(status) {
  if (status === 'pending') return s.statusPending;
  if (status === 'resolved') return s.statusResolved;
  if (status === 'closed') return s.statusClosed;
  return s.statusOpen;
}

export default function CaseClient({ data: initial }) {
  const [caseData, setCaseData] = useState(initial.case);
  const [notes, setNotes] = useState(initial.case.adminNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const user = initial.user;
  const setting = initial.setting;
  const lastSession = initial.lastSession;
  const recentLogs = initial.recentLogs ?? [];
  const pastCases = initial.pastCases ?? [];
  const linkedEmails = initial.linkedEmails ?? [];

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

  const handleNotesBlur = useCallback(() => {
    if (notes !== (initial.case.adminNotes ?? '')) {
      patchCase({ adminNotes: notes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

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
                    <Link key={e.id} href={`/admin/ticket/${e.id}`} className={s.emailItem}>
                      <span className={s.emailSubject}>{e.subject}</span>
                      <span className={s.emailDate}>{fmtDate(e.receivedAt)}</span>
                    </Link>
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
                  {lastSession && (
                    <div className={s.infoRow}>
                      <span className={s.infoKey}>Last active</span>
                      <span className={s.infoVal}>{fmtDate(lastSession)}</span>
                    </div>
                  )}
                </div>

                {/* Subscription */}
                {setting && (
                  <div className={s.panelSection}>
                    <div className={s.panelSectionTitle}>Subscription</div>
                    {setting.type && (
                      <div className={s.infoRow}>
                        <span className={s.infoKey}>Type</span>
                        <span className={s.infoVal}>{setting.type}</span>
                      </div>
                    )}
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
                          {setting.trialStartDate && `${fmtDate(setting.trialStartDate)} – `}
                          {setting.trialEndDate ? fmtDate(setting.trialEndDate) : 'active'}
                        </span>
                      </div>
                    )}
                    {setting.stripeSubscriptionId && (
                      <div className={s.infoRow}>
                        <span className={s.infoKey}>Stripe sub</span>
                        <span className={s.infoVal} style={{ fontSize: '0.68rem' }}>
                          {setting.stripeSubscriptionId}
                        </span>
                      </div>
                    )}
                    {setting.stripeCustomerId && (
                      <div className={s.infoRow}>
                        <span className={s.infoKey}>Stripe customer</span>
                        <span className={s.infoVal} style={{ fontSize: '0.68rem' }}>
                          {setting.stripeCustomerId}
                        </span>
                      </div>
                    )}
                    {setting.authorizeSubscriptionId && (
                      <div className={s.infoRow}>
                        <span className={s.infoKey}>Auth.net sub</span>
                        <span className={s.infoVal} style={{ fontSize: '0.68rem' }}>
                          {setting.authorizeSubscriptionId}
                        </span>
                      </div>
                    )}
                    {setting.authorizeCustomerId && (
                      <div className={s.infoRow}>
                        <span className={s.infoKey}>Auth.net customer</span>
                        <span className={s.infoVal} style={{ fontSize: '0.68rem' }}>
                          {setting.authorizeCustomerId}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Recent activity */}
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
