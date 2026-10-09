'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CtaButton } from '@/components/ui';
import content from '@/data/content/adminSupport.json';

// The support agent's review card in /admin — the same content the Slack card shows (the `card`
// model comes from cardModel in lib/support/slack.js) and the same decisions: Accept / Undo call
// acceptFire / undoFire (lib/support/fire.js) via /api/support/fires/[id]/*, a note goes to the
// existing /api/support/refine, Re-investigate to the existing /api/support/case. Nothing here
// executes a play; the 5-minute fuse (fuse-tick cron → fireOne) does that for both surfaces.
const L = content.card;

const STATUS_COLOR = {
  posted: 'var(--accent)',
  scheduled: 'var(--color-warning)',
  firing: 'var(--color-warning)',
  fired: 'var(--color-success)',
  failed: 'var(--color-danger)',
  held: 'var(--color-danger)',
  cancelled: 'var(--text-ghost)',
  rejected: 'var(--text-ghost)',
};

function fmtCountdown(ms) {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

async function postJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || j.reason || `HTTP ${res.status}`);
  return j;
}

export default function SupportPlayCard({ fire, now, onChanged }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const m = fire.card;
  const statusKey = fire.status === 'failed' && fire.held ? 'held' : fire.status;
  const color = STATUS_COLOR[statusKey] || 'var(--text-ghost)';
  const msLeft = fire.fire_at ? new Date(fire.fire_at).getTime() - now : 0;
  const scheduled = fire.status === 'scheduled';
  const canUndo = scheduled && msLeft > 5000;
  const awaiting = fire.status === 'posted';
  const steps = fire.result?.steps || [];
  const caseHref = m.caseId ? `/admin/cases/${m.caseId}` : null;

  async function run(kind, fn) {
    setBusy(kind); setErr('');
    try { await fn(); await onChanged?.(); }
    catch (e) { setErr(`${L.error}: ${e.message}`); }
    finally { setBusy(''); }
  }
  const accept = () => run('accept', () => postJson(`/api/support/fires/${fire.id}/accept`));
  const undo = () => run('undo', () => postJson(`/api/support/fires/${fire.id}/undo`));
  const sendNote = () => run('note', async () => { await postJson('/api/support/refine', { threadTs: fire.thread_ts, note: note.trim() }); setNote(''); });
  const reinvestigate = () => run('reinvestigate', () => postJson('/api/support/case', { email: fire.member_email, caseId: fire.case_id, threadTs: fire.thread_ts || undefined }));

  const card = { background: 'var(--bg-surface)', border: `1px solid ${awaiting || scheduled ? 'var(--border-accent)' : 'var(--border-default)'}`, borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 16, color: 'var(--text)', fontFamily: 'var(--font-body)' };
  const headRow = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 6 };
  const email = { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, wordBreak: 'break-all' };
  const pill = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text)', border: `1px solid ${color}`, borderRadius: 'var(--radius-pill)', padding: '3px 10px' };
  const dot = { width: 8, height: 8, borderRadius: '50%', background: color };
  const ctx = { fontSize: 13, color: 'var(--text-subtle)', display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 };
  const link = { color: 'var(--accent-light)', textDecoration: 'underline' };
  const section = { marginBottom: 14 };
  const label = { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-subtle)', marginBottom: 6 };
  const quote = { background: 'var(--bg-base)', borderLeft: '3px solid var(--border-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'var(--font-body)', lineHeight: 1.5 };
  const body = { fontSize: 14, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.5, margin: 0 };
  const list = { margin: 0, paddingLeft: 18, listStyle: 'disc', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 };
  const hint = { fontSize: 13, color: 'var(--text-subtle)', margin: '6px 0 0' };
  const banner = { background: 'var(--bg-base)', border: `1px solid ${color}`, borderRadius: 'var(--radius-md)', padding: '10px 12px', fontSize: 14, marginBottom: 14, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' };
  const stepRow = { fontSize: 13, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', wordBreak: 'break-word' };
  const controls = { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 };
  const textarea = { width: '100%', minHeight: 70, boxSizing: 'border-box', background: 'var(--bg-base)', color: 'var(--text)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 10, fontSize: 14, fontFamily: 'var(--font-body)', marginBottom: 8 };
  const errStyle = { fontSize: 13, color: 'var(--text)', borderLeft: '3px solid var(--color-danger)', paddingLeft: 8, marginTop: 10 };
  const working = { fontSize: 13, color: 'var(--text-subtle)' };

  return (
    <div style={card}>
      <div style={headRow}>
        <span style={email}>{m.memberEmail}</span>
        <span style={pill}><span style={dot} />{content.status[statusKey] || fire.status}</span>
      </div>
      <div style={ctx}>
        <strong style={{ color: 'var(--text-muted)' }}>{m.issueClass}</strong>
        <span>·</span>
        {caseHref ? <Link href={caseHref} style={link}>{L.case} {m.caseId}</Link> : <span>{L.noCase}</span>}
        {m.userId && <><span>·</span><Link href={`/admin/users/${m.userId}`} style={link}>{L.customer}</Link></>}
        <span>·</span><span>#{fire.id}</span>
        <span>·</span><span>{fire.onSlack ? L.onSlack : L.notOnSlack}</span>
      </div>

      {scheduled && (
        <div style={banner}>
          <span suppressHydrationWarning>{canUndo ? `${L.firesIn} ${fmtCountdown(msLeft)} · ${L.undoHint}` : L.firingNow}</span>
          {canUndo && <CtaButton size="sm" variant="ghost" onClick={undo} disabled={!!busy}>{busy === 'undo' ? L.undoing : L.undo}</CtaButton>}
        </div>
      )}

      {m.customerMessage && (
        <div style={section}>
          <div style={label}>
            {L.customerMessage}
            {m.customerMessage.subject ? ` · ${m.customerMessage.subject}` : ''}
            {m.customerMessage.date ? ` · ${m.customerMessage.date}` : ''}
            {m.messageId && <> · <Link href={`/admin/ticket/${m.messageId}`} style={link}>{L.openMessage}</Link></>}
          </div>
          <pre style={quote}>{m.customerMessage.body}</pre>
        </div>
      )}

      <div style={section}>
        <div style={label}>{L.findings}</div>
        <p style={body}>{m.findings || L.none}</p>
      </div>

      <div style={section}>
        <div style={label}>{L.suggestedReply}</div>
        <pre style={quote}>{m.reply || L.none}</pre>
      </div>

      <div style={section}>
        <div style={label}>{L.actions}</div>
        <ul style={list}>
          {m.actionLines.length ? m.actionLines.map((l, i) => <li key={i}>{l}</li>) : <li>{L.nothingToDo}</li>}
        </ul>
        {m.closesCase && <p style={hint}>{L.closesCase}</p>}
      </div>

      {m.openQuestions.length > 0 && (
        <div style={section}>
          <div style={label}>{L.openQuestions}</div>
          <ul style={list}>{m.openQuestions.map((q, i) => <li key={i}>{q}</li>)}</ul>
        </div>
      )}

      {m.reviewerNote && (
        <div style={section}>
          <div style={label}>{L.reviewerNote}</div>
          <p style={body}>{m.reviewerNote}</p>
        </div>
      )}

      {steps.length > 0 && (
        <div style={section}>
          <div style={label}>{L.result}</div>
          {fire.held && <p style={{ ...body, marginBottom: 6, color: 'var(--text)' }}>{L.heldNote}</p>}
          {steps.map((s, i) => (
            <div key={i} style={stepRow}>
              {s.ok ? '✅' : (s.skipped || s.held ? '⏸️' : '❌')} {s.step}{s.error ? `: ${s.error}` : (s.note ? `: ${s.note}` : '')}
            </div>
          ))}
        </div>
      )}

      {awaiting && (
        <div style={section}>
          {fire.thread_ts ? (
            <textarea style={textarea} value={note} onChange={(e) => setNote(e.target.value)} placeholder={L.notePlaceholder} disabled={!!busy} />
          ) : (
            <p style={{ ...hint, marginBottom: 8 }}>{L.noteNeedsSlack}</p>
          )}
          <div style={controls}>
            <CtaButton size="sm" onClick={accept} disabled={!!busy}>{busy === 'accept' ? L.accepting : L.accept}</CtaButton>
            {fire.thread_ts && <CtaButton size="sm" variant="ghost" onClick={sendNote} disabled={!!busy || !note.trim()}>{L.sendNote}</CtaButton>}
            <CtaButton size="sm" variant="ghost" onClick={reinvestigate} disabled={!!busy}>{L.reinvestigate}</CtaButton>
            {busy === 'note' && <span style={working}>{L.sendingNote}</span>}
            {busy === 'reinvestigate' && <span style={working}>{L.reinvestigating}</span>}
          </div>
        </div>
      )}

      {err && <div style={errStyle}>{err}</div>}
    </div>
  );
}
