'use client';
import { useState } from 'react';
import Link from 'next/link';
import s from './ticket.module.css';

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function statusClass(status) {
  if (status === 'replied') return s.badgeReplied;
  if (status === 'closed') return s.badgeClosed;
  return s.badgeOpen;
}

function migrationClass(type) {
  const map = {
    stripe: s.badgeStripe,
    active_current: s.badgeActiveCurrent,
    active_expired: s.badgeActiveExpired,
    inactive: s.badgeInactive,
  };
  return map[type] ?? s.badgeUnknown;
}

export default function TicketClient({ ticket: initial }) {
  const [ticket, setTicket] = useState(initial);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');
  const [notes, setNotes] = useState(initial.adminNotes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [showCaseForm, setShowCaseForm] = useState(false);
  const [caseTitle, setCaseTitle] = useState(initial.subject ?? '');
  const [casePriority, setCasePriority] = useState('normal');
  const [openingCase, setOpeningCase] = useState(false);
  const [caseMsg, setCaseMsg] = useState('');

  const user = ticket.user;
  const setting = ticket.userSetting;
  const logs = ticket.recentLogs ?? [];
  const replies = ticket.replies ?? [];

  async function sendReply() {
    if (!reply.trim()) return;
    setSending(true);
    setSendMsg('');
    try {
      const res = await fetch(`/api/admin/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: reply }),
      });
      const data = await res.json();
      if (!res.ok) { setSendMsg(data.error ?? 'Send failed'); return; }
      setReply('');
      setSendMsg('Reply sent!');
      setTicket((t) => ({
        ...t,
        status: 'replied',
        replies: [...(t.replies ?? []), data.reply],
      }));
    } catch {
      setSendMsg('Network error — try again');
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(e) {
    const status = e.target.value;
    await fetch(`/api/admin/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setTicket((t) => ({ ...t, status }));
  }

  async function saveNotes() {
    setSavingNotes(true);
    await fetch(`/api/admin/tickets/${ticket.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminNotes: notes }),
    });
    setSavingNotes(false);
  }

  async function openCase(e) {
    e.preventDefault();
    if (!caseTitle.trim()) return;
    setOpeningCase(true);
    setCaseMsg('');
    try {
      const res = await fetch('/api/admin/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEmail: ticket.fromEmail,
          fromName: ticket.fromName ?? null,
          title: caseTitle,
          priority: casePriority,
          emailId: ticket.id,
          userId: ticket.userId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCaseMsg(data.error ?? 'Failed to open case'); return; }
      setTicket((t) => ({ ...t, caseId: data.case.id, case: { id: data.case.id, title: data.case.title, status: data.case.status } }));
      setShowCaseForm(false);
    } catch {
      setCaseMsg('Network error — try again');
    } finally {
      setOpeningCase(false);
    }
  }

  return (
    <>
      <Link href="/admin/inbox" className={s.back}>← Back to inbox</Link>

      <div className={s.grid}>
        {/* Left: thread + reply */}
        <div>
          <div className={s.thread}>
            <div className={s.threadHeader}>
              <div className={s.subject}>{ticket.subject}</div>
              <div className={s.meta}>
                <span className={s.metaFrom}>{ticket.fromName ? `${ticket.fromName} <${ticket.fromEmail}>` : ticket.fromEmail}</span>
                <span className={s.metaDate}>{fmtDate(ticket.receivedAt)}</span>
                <span className={`${s.badge} ${statusClass(ticket.status)}`}>{ticket.status}</span>
              </div>
            </div>

            <div className={s.body}>{ticket.body}</div>

            {replies.length > 0 && (
              <div className={s.repliesSection}>
                <div className={s.repliesTitle}>Replies ({replies.length})</div>
                {replies.map((r) => (
                  <div key={r.id} className={s.replyItem}>
                    {r.body}
                    <div className={s.replyMeta}>Sent {fmtDate(r.sentAt)}</div>
                  </div>
                ))}
              </div>
            )}

            <div className={s.statusRow}>
              <span className={s.statusLabel}>Status</span>
              <select className={s.statusSelect} value={ticket.status} onChange={updateStatus}>
                <option value="open">Open</option>
                <option value="replied">Replied</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className={s.composer}>
              <div className={s.composerLabel}>Reply as support@gymnasticbodies.com</div>
              <textarea
                className={s.textarea}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply…"
              />
              <div className={s.composerActions}>
                <button className={s.sendBtn} onClick={sendReply} disabled={sending || !reply.trim()}>
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
                {sendMsg && <span className={s.composerMsg}>{sendMsg}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Right: user panel */}
        <div>
          <div className={s.panel}>
            <div className={s.panelTitle}>Customer</div>

            {/* Case link or open case button */}
            <div className={s.caseSection}>
              {ticket.caseId ? (
                <Link href={`/admin/cases/${ticket.caseId}`} className={s.viewCaseLink}>
                  View Case #{ticket.caseId} →
                </Link>
              ) : ticket.userId ? (
                <>
                  {!showCaseForm ? (
                    <button className={s.openCaseBtn} onClick={() => setShowCaseForm(true)}>
                      Open Case
                    </button>
                  ) : (
                    <form onSubmit={openCase} className={s.caseForm}>
                      <input
                        className={s.caseInput}
                        value={caseTitle}
                        onChange={(e) => setCaseTitle(e.target.value)}
                        placeholder="Case title"
                        required
                      />
                      <select
                        className={s.caseSelect}
                        value={casePriority}
                        onChange={(e) => setCasePriority(e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <div className={s.caseFormRow}>
                        <button type="submit" className={s.openCaseBtn} disabled={openingCase}>
                          {openingCase ? 'Opening…' : 'Submit'}
                        </button>
                        <button type="button" className={s.cancelCaseBtn} onClick={() => setShowCaseForm(false)}>
                          Cancel
                        </button>
                      </div>
                      {caseMsg && <div className={s.caseMsg}>{caseMsg}</div>}
                    </form>
                  )}
                </>
              ) : null}
            </div>
            {!user ? (
              <div className={s.noUser}>No account found for {ticket.fromEmail}</div>
            ) : (
              <div className={s.userInfo}>
                <div className={s.userName}>{user.name}</div>
                <div className={s.userEmail}>{user.email}</div>
                <Link href={`/admin/users/${user.id}`} className={s.profileLink}>
                  View full profile →
                </Link>

                <div className={s.infoRow}>
                  <span className={s.infoKey}>Status</span>
                  <span className={`${s.migBadge} ${migrationClass(user.migrationType)}`}>
                    {user.migrationType?.replace(/_/g, ' ') ?? 'unknown'}
                  </span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoKey}>Member since</span>
                  <span className={s.infoVal}>
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                {setting?.stripeSubscriptionId && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Stripe sub</span>
                    <span className={s.infoVal} style={{ fontSize: '0.7rem' }}>{setting.stripeSubscriptionId}</span>
                  </div>
                )}
                {setting?.stripeCustomerId && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Stripe customer</span>
                    <span className={s.infoVal} style={{ fontSize: '0.7rem' }}>{setting.stripeCustomerId}</span>
                  </div>
                )}
                {setting?.trial && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Trial</span>
                    <span className={s.infoVal}>
                      {setting.trialEndDate ? `until ${new Date(setting.trialEndDate).toLocaleDateString()}` : 'active'}
                    </span>
                  </div>
                )}
                {setting?.status && (
                  <div className={s.infoRow}>
                    <span className={s.infoKey}>Sub status</span>
                    <span className={s.infoVal}>{setting.status}</span>
                  </div>
                )}
              </div>
            )}

            {logs.length > 0 && (
              <div className={s.logsSection}>
                <div className={s.logsTitle}>Recent activity</div>
                {logs.map((l) => (
                  <div key={l.id} className={s.logItem}>
                    <span className={s.logEvent}>{l.event}</span>
                    <span className={s.logTs}>{new Date(l.ts).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={s.notesSection}>
              <div className={s.notesLabel}>Admin notes</div>
              <textarea
                className={s.notesTextarea}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes…"
              />
              <button className={s.saveNotesBtn} onClick={saveNotes} disabled={savingNotes}>
                {savingNotes ? 'Saving…' : 'Save notes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
