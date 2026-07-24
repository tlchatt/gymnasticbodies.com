'use client';

/**
 * SupportSection — the "Messages" and "Cases" panels for the My Account page.
 *
 * Renders TWO clearly separated, individually titled cards (not one merged thread):
 *
 *   1. Messages — the member's full message history (offers, promos, confirmations,
 *      support requests). A compact, scannable, newest-first list collapsed to a
 *      handful of rows with a "Show more" toggle. This card also owns the
 *      **Contact Support** entry point (a toggle that opens a subject+body compose form).
 *
 *   2. Cases — the member's formal support cases. Each case shows its title, status +
 *      priority badges, and created/resolved dates, and expands to reveal that case's
 *      messages (chronological) plus an inline Reply box. Hidden entirely when the
 *      member has no cases.
 *
 * Props (from lib/accountData.js → getSupportSection, plus userId from the shell):
 *   messages : Array<{
 *     id: string, direction: 'inbound'|'outbound', subject: string, body: string,
 *     date: string|Date, status?: string, caseId?: number|null,
 *     caseTitle?: string|null, campaign?: string|null, type?: string
 *   }>                                   — sorted chronologically (ascending)
 *   cases : Array<{
 *     id: number, title: string, status: string, priority: string,
 *     createdAt: Date, resolvedAt: Date|null
 *   }>
 *   userId : string                      — required for the send actions. If missing,
 *                                          reply / contact-support degrade gracefully.
 *
 * Interactions (both POST /api/user/support-message):
 *   • Contact Support (Messages card) → { userId, subject, body }  (optimistic append)
 *   • Inline case reply (Cases card)  → { userId, caseId, body }   (optimistic append)
 */

import { useState, useRef } from 'react';
import { Badge } from '@/components/ui';
import { AccountCard, ACCENT } from './accountUi';

// How many message rows to show before the "Show more" toggle.
const INITIAL_VISIBLE = 6;

// ─── date / text helpers ──────────────────────────────────────────────────────
function fmtDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtDateTime(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

function sortByDateAsc(list) {
    return [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function sortByDateDesc(list) {
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function snippet(text, max = 120) {
    if (!text) return '';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

/**
 * Derive a small "who / what kind" label + Badge variant for a message row,
 * from direction + type + campaign. Keeps the Messages list scannable at a glance.
 */
function messageMeta(m) {
    if (m.direction === 'inbound') {
        return { from: 'You', label: 'Sent', variant: 'accent' };
    }
    // Outbound = sent to the member by GymnasticBodies.
    if (m.type === 'marketing') return { from: 'GymnasticBodies', label: 'Promo', variant: 'marketing' };
    if (m.type === 'support') return { from: 'GymnasticBodies', label: 'Support', variant: 'support' };
    return { from: 'GymnasticBodies', label: 'Message', variant: 'accent' };
}

/**
 * Map an inserted support_emails row (from the POST response) into a message object
 * shaped like the ones this component renders. The API always inserts an INBOUND row
 * (the member's message), so direction is fixed to 'inbound'.
 */
function rowToMessage(row, fallback = {}) {
    return {
        id: row?.id != null ? `in-${row.id}` : (fallback.id || `in-${Date.now()}`),
        direction: 'inbound',
        subject: row?.subject ?? fallback.subject ?? '',
        body: row?.body ?? fallback.body ?? '',
        date: row?.receivedAt ?? fallback.date ?? new Date().toISOString(),
        status: row?.status ?? 'open',
        caseId: row?.caseId ?? fallback.caseId ?? null,
        caseTitle: fallback.caseTitle ?? null,
    };
}

// ─── static style objects ─────────────────────────────────────────────────────
const primaryBtn = {
    background: ACCENT,
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    padding: '9px 18px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
};

const ghostBtn = {
    background: 'transparent',
    color: '#666',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '9px 16px',
    fontSize: '0.9rem',
    cursor: 'pointer',
};

const showMoreBtn = {
    background: 'transparent',
    color: ACCENT,
    border: 'none',
    padding: '10px 0 0',
    fontSize: '0.86rem',
    fontWeight: 600,
    cursor: 'pointer',
};

const textareaStyle = {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '72px',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    color: '#222',
};

const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    color: '#222',
};

const errorStyle = { color: '#d64545', fontSize: '0.82rem', margin: '8px 0 0' };

const emptyStyle = { color: '#888', fontSize: '0.9rem', margin: 0 };

// ─── compact message row (Messages card) — accordion ──────────────────────────
// Collapsed: badge + subject + from + date + snippet, with a rotating ▸ chevron.
// Expanded: the full, untruncated body below the row (line breaks preserved).
// The header is focusable (role=button, aria-expanded) and toggles on click / Enter / Space.
function MessageRow({ m, expanded, onToggle }) {
    const meta = messageMeta(m);
    const outerStyle = {
        borderBottom: '1px solid #f2f2f2',
        opacity: m._pending ? 0.6 : 1,
    };
    const headerStyle = {
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
        padding: '12px 0',
        cursor: 'pointer',
    };
    const chevronStyle = {
        flex: '0 0 auto',
        width: '12px',
        paddingTop: '3px',
        fontSize: '0.8rem',
        color: ACCENT,
        display: 'inline-block',
        transition: 'transform 0.15s ease',
        transform: expanded ? 'rotate(90deg)' : 'none',
    };
    return (
        <div style={outerStyle}>
            <div
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                onClick={onToggle}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
                style={headerStyle}
            >
                <span style={chevronStyle} aria-hidden="true">▸</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#2b2b2b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.subject || '(no subject)'}
                        </span>
                        {m.campaign ? (
                            <span style={{ fontSize: '0.72rem', color: '#aaa' }}>· {m.campaign}</span>
                        ) : null}
                    </div>
                    {m.body && !expanded ? (
                        <div style={{ fontSize: '0.85rem', color: '#777', lineHeight: 1.45 }}>{snippet(m.body)}</div>
                    ) : null}
                    <div style={{ fontSize: '0.74rem', color: '#aaa', marginTop: '4px' }}>{meta.from}</div>
                </div>
                <div style={{ fontSize: '0.76rem', color: '#999', whiteSpace: 'nowrap', paddingTop: '2px' }}>
                    {m._pending ? 'Sending…' : fmtDate(m.date)}
                </div>
            </div>
            {expanded ? (
                <div style={{ padding: '0 0 14px 24px' }}>
                    {m.body ? (
                        <div style={{
                            fontSize: '0.87rem',
                            color: '#555',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            lineHeight: 1.5,
                            borderLeft: `2px solid ${ACCENT}`,
                            paddingLeft: '12px',
                        }}>
                            {m.body}
                        </div>
                    ) : (
                        <div style={{ fontSize: '0.85rem', color: '#999', fontStyle: 'italic', paddingLeft: '14px' }}>
                            (no message body)
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}

// ─── message bubble (Cases card — case thread view) ───────────────────────────
function MessageBubble({ m }) {
    const isMember = m.direction === 'inbound';
    const bubbleStyle = {
        maxWidth: '82%',
        padding: '10px 14px',
        borderRadius: '10px',
        border: isMember ? '1px solid #f0e0d6' : '1px solid #ececec',
        background: isMember ? '#fbf3ee' : '#f5f5f6',
        opacity: m._pending ? 0.6 : 1,
    };
    return (
        <div style={{ display: 'flex', justifyContent: isMember ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
            <div style={bubbleStyle}>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: m.subject ? '2px' : '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isMember ? ACCENT : '#555' }}>
                        {isMember ? 'You' : 'Support'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#999', whiteSpace: 'nowrap' }}>
                        {m._pending ? 'Sending…' : fmtDateTime(m.date)}
                    </span>
                </div>
                {m.subject ? (
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#333', marginBottom: '3px' }}>{m.subject}</div>
                ) : null}
                {m.body ? (
                    <div style={{ fontSize: '0.87rem', color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45 }}>
                        {m.body}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

// ─── component ────────────────────────────────────────────────────────────────
export default function SupportSection({ messages = [], cases = [], userId = null }) {
    const canSend = !!userId;

    const [msgs, setMsgs] = useState(() => messages);
    const [showAllMessages, setShowAllMessages] = useState(false);
    const [activeCaseId, setActiveCaseId] = useState(null);

    // Which message rows are expanded (accordion). Multiple may be open at once.
    const [expandedMsgIds, setExpandedMsgIds] = useState(() => new Set());
    function toggleMsg(id) {
        setExpandedMsgIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    // Contact Support (Messages card) compose state.
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeSending, setComposeSending] = useState(false);
    const [composeError, setComposeError] = useState('');

    // Inline case reply state (only one case is expanded at a time, so single set is fine).
    const [replyText, setReplyText] = useState('');
    const [replySending, setReplySending] = useState(false);
    const [replyError, setReplyError] = useState('');

    // Guards against double-submit for both actions (setState is async and can't block
    // a second click before re-render — this ref does).
    const submittingRef = useRef(false);

    async function postMessage(payload) {
        const res = await fetch('/api/user/support-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data?.ok) {
            throw new Error(data?.error || 'Could not send your message. Please try again.');
        }
        return data.message; // inserted support_emails row (may be null on odd responses)
    }

    async function handleCompose() {
        if (submittingRef.current) return;
        const subject = composeSubject.trim();
        const body = composeBody.trim();
        if (!body) { setComposeError('Please enter a message.'); return; }
        if (!canSend) { setComposeError('Sign in again to send messages.'); return; }

        submittingRef.current = true;
        setComposeSending(true);
        setComposeError('');

        const tempId = `temp-${Date.now()}`;
        const optimistic = {
            id: tempId,
            direction: 'inbound',
            subject: subject || 'Contact Support',
            body,
            date: new Date().toISOString(),
            status: 'open',
            caseId: null,
            _pending: true,
        };
        // Optimistic: add immediately; show newest first so it's visible without expanding.
        setMsgs((prev) => [...prev, optimistic]);
        setShowAllMessages(false);

        try {
            const row = await postMessage({ userId, subject, body });
            setMsgs((prev) => prev.map((m) => (
                m.id === tempId ? rowToMessage(row, { ...optimistic, _pending: false }) : m
            )));
            // Clear + close on success.
            setComposeSubject('');
            setComposeBody('');
            setComposeOpen(false);
        } catch (err) {
            // Roll back the optimistic entry, keep the form open with the draft intact.
            setMsgs((prev) => prev.filter((m) => m.id !== tempId));
            setComposeError(err.message);
        } finally {
            submittingRef.current = false;
            setComposeSending(false);
        }
    }

    async function handleReply(caseObj) {
        if (submittingRef.current) return;
        const body = replyText.trim();
        if (!body) { setReplyError('Please enter a message.'); return; }
        if (!canSend) { setReplyError('Sign in again to send messages.'); return; }

        submittingRef.current = true;
        setReplySending(true);
        setReplyError('');

        const tempId = `temp-${Date.now()}`;
        const optimistic = {
            id: tempId,
            direction: 'inbound',
            subject: `Reply: ${caseObj.title}`,
            body,
            date: new Date().toISOString(),
            status: 'open',
            caseId: caseObj.id,
            caseTitle: caseObj.title,
            _pending: true,
        };
        // Optimistic: add immediately, clear the box.
        setMsgs((prev) => [...prev, optimistic]);
        setReplyText('');

        try {
            const row = await postMessage({ userId, caseId: caseObj.id, body });
            setMsgs((prev) => prev.map((m) => (
                m.id === tempId ? rowToMessage(row, { ...optimistic, _pending: false }) : m
            )));
        } catch (err) {
            // Roll back the optimistic entry and restore the draft.
            setMsgs((prev) => prev.filter((m) => m.id !== tempId));
            setReplyText(body);
            setReplyError(err.message);
        } finally {
            submittingRef.current = false;
            setReplySending(false);
        }
    }

    // ─── Messages card ────────────────────────────────────────────────────────
    const contactBtn = (
        <button
            type="button"
            style={{ ...primaryBtn, ...(canSend ? null : { opacity: 0.5, cursor: 'not-allowed' }) }}
            disabled={!canSend}
            title={canSend ? 'Send a new message to support' : 'Sign in again to contact support'}
            onClick={() => { setComposeOpen((v) => !v); setComposeError(''); }}
        >
            {composeOpen ? 'Close' : 'Contact Support'}
        </button>
    );

    const orderedMsgs = sortByDateDesc(msgs);
    const visibleMsgs = showAllMessages ? orderedMsgs : orderedMsgs.slice(0, INITIAL_VISIBLE);
    const hiddenCount = orderedMsgs.length - visibleMsgs.length;

    const messagesCard = (
        <AccountCard title="Messages" action={contactBtn}>
            {/* Contact Support compose form */}
            {composeOpen && (
                <div style={{ background: '#faf7f5', border: '1px solid #f0e6e0', borderRadius: '8px', padding: '16px', marginBottom: '18px' }}>
                    <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#999', fontWeight: 600, marginBottom: '8px' }}>
                        New message to support
                    </div>
                    <input
                        type="text"
                        placeholder="Subject (optional)"
                        value={composeSubject}
                        onChange={(e) => setComposeSubject(e.target.value)}
                        style={{ ...inputStyle, marginBottom: '10px' }}
                        disabled={composeSending}
                    />
                    <textarea
                        placeholder="How can we help?"
                        value={composeBody}
                        onChange={(e) => setComposeBody(e.target.value)}
                        style={textareaStyle}
                        disabled={composeSending}
                    />
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                        <button
                            type="button"
                            style={{ ...primaryBtn, ...((composeSending || !canSend) ? { opacity: 0.5, cursor: 'not-allowed' } : null) }}
                            disabled={composeSending || !canSend}
                            onClick={handleCompose}
                        >
                            {composeSending ? 'Sending…' : 'Send message'}
                        </button>
                        <button
                            type="button"
                            style={ghostBtn}
                            disabled={composeSending}
                            onClick={() => { setComposeOpen(false); setComposeError(''); }}
                        >
                            Cancel
                        </button>
                    </div>
                    {composeError ? <p style={errorStyle}>{composeError}</p> : null}
                </div>
            )}

            {/* Message list — compact, newest first, collapsed with Show more */}
            {orderedMsgs.length === 0 ? (
                <p style={emptyStyle}>
                    No messages yet.{' '}
                    {canSend
                        ? 'Use “Contact Support” above to start a conversation.'
                        : 'Sign in again to contact support.'}
                </p>
            ) : (
                <div>
                    {visibleMsgs.map((m) => (
                        <MessageRow
                            key={m.id}
                            m={m}
                            expanded={expandedMsgIds.has(m.id)}
                            onToggle={() => toggleMsg(m.id)}
                        />
                    ))}
                    {hiddenCount > 0 ? (
                        <button type="button" style={showMoreBtn} onClick={() => setShowAllMessages(true)}>
                            Show {hiddenCount} more {hiddenCount === 1 ? 'message' : 'messages'}
                        </button>
                    ) : (orderedMsgs.length > INITIAL_VISIBLE ? (
                        <button type="button" style={showMoreBtn} onClick={() => setShowAllMessages(false)}>
                            Show less
                        </button>
                    ) : null)}
                </div>
            )}
        </AccountCard>
    );

    // ─── Cases card (hidden when the member has no cases) ──────────────────────
    const casesCard = cases.length > 0 ? (
        <AccountCard title="Cases">
            {cases.map((c) => {
                const isActive = activeCaseId === c.id;
                const caseMsgs = sortByDateAsc(msgs.filter((m) => m.caseId === c.id));
                return (
                    <div
                        key={c.id}
                        style={{
                            border: `1px solid ${isActive ? '#f0d6c8' : '#f0f0f0'}`,
                            borderRadius: '8px',
                            marginBottom: '10px',
                            overflow: 'hidden',
                            background: isActive ? '#fffaf7' : '#fff',
                        }}
                    >
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => { setActiveCaseId(isActive ? null : c.id); setReplyError(''); setReplyText(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveCaseId(isActive ? null : c.id); setReplyError(''); setReplyText(''); } }}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', cursor: 'pointer' }}
                        >
                            <span style={{ fontSize: '0.85rem', color: ACCENT, width: '14px' }}>{isActive ? '▾' : '▸'}</span>
                            <span style={{ flex: 1, color: '#222', fontSize: '0.95rem', fontWeight: 500 }}>{c.title}</span>
                            <Badge variant={c.priority}>{c.priority}</Badge>
                            <Badge variant={c.status}>{c.status}</Badge>
                            <span style={{ color: '#999', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{fmtDate(c.createdAt)}</span>
                        </div>

                        {isActive && (
                            <div style={{ padding: '4px 14px 16px', borderTop: '1px solid #f2e8e2' }}>
                                <div style={{ fontSize: '0.78rem', color: '#999', margin: '10px 0' }}>
                                    Opened {fmtDate(c.createdAt)}
                                    {c.resolvedAt ? ` · Resolved ${fmtDate(c.resolvedAt)}` : ''}
                                </div>

                                {caseMsgs.length > 0 ? (
                                    <div style={{ margin: '12px 0' }}>
                                        {caseMsgs.map((m) => <MessageBubble key={m.id} m={m} />)}
                                    </div>
                                ) : (
                                    <p style={{ color: '#999', fontSize: '0.85rem', margin: '12px 0' }}>
                                        No messages on this case yet.
                                    </p>
                                )}

                                {/* Inline reply */}
                                <textarea
                                    placeholder={canSend ? 'Write a reply…' : 'Sign in again to reply'}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    style={textareaStyle}
                                    disabled={replySending || !canSend}
                                />
                                <div style={{ marginTop: '10px' }}>
                                    <button
                                        type="button"
                                        style={{ ...primaryBtn, ...((replySending || !canSend) ? { opacity: 0.5, cursor: 'not-allowed' } : null) }}
                                        disabled={replySending || !canSend}
                                        onClick={() => handleReply(c)}
                                    >
                                        {replySending ? 'Sending…' : 'Send reply'}
                                    </button>
                                </div>
                                {replyError ? <p style={errorStyle}>{replyError}</p> : null}
                            </div>
                        )}
                    </div>
                );
            })}
        </AccountCard>
    ) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {casesCard}
            {messagesCard}
        </div>
    );
}
