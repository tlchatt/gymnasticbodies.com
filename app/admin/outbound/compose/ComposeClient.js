'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader, CtaButton, Card } from '@/components/ui';
import s from './compose.module.css';

const today = new Date().toISOString().slice(0, 10);

function parseEmails(raw) {
  return raw
    .split(/[\n,]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes('@'));
}

export default function ComposeClient() {
  const [type,     setType]     = useState('support');
  const [campaign, setCampaign] = useState(`outreach_${today}`);
  const [rawEmails,setRawEmails]= useState('');
  const [subject,  setSubject]  = useState('');
  const [body,     setBody]     = useState('');
  const [step,     setStep]     = useState('compose'); // compose | preview | sending | done
  const [previews, setPreviews] = useState([]);
  const [results,  setResults]  = useState(null);
  const [error,    setError]    = useState('');

  const emails = useMemo(() => parseEmails(rawEmails), [rawEmails]);

  async function handlePreview() {
    setError('');
    const res = await fetch('/api/admin/outbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: emails.slice(0, 3), subject, body, campaign, type, dryRun: true }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); return; }
    setPreviews(data.results);
    setStep('preview');
  }

  async function handleSend() {
    setStep('sending');
    setError('');
    const res = await fetch('/api/admin/outbound/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails, subject, body, campaign, type, dryRun: false }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setStep('preview'); return; }
    setResults(data);
    setStep('done');
  }

  if (step === 'done' && results) {
    return (
      <>
        <PageHeader title="Outbound Sent" />
        <Card padding="lg" className={s.doneCard}>
          <div className={s.doneStats}>
            <span className={s.statBig}>{results.sent}</span>
            <span className={s.statLabel}>sent</span>
            {results.failed > 0 && <>
              <span className={s.statBig + ' ' + s.statFailed}>{results.failed}</span>
              <span className={s.statLabel}>failed</span>
            </>}
          </div>
          {results.failed > 0 && (
            <ul className={s.failList}>
              {results.results.filter(r => r.status === 'failed').map(r => (
                <li key={r.email}>{r.email} — {r.error}</li>
              ))}
            </ul>
          )}
          <div className={s.doneActions}>
            <CtaButton href="/admin/inbox">Back to Inbox</CtaButton>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Compose Outbound">
        <Link href="/admin/inbox" className={s.backLink}>← Back to Inbox</Link>
      </PageHeader>

      {error && <div className={s.error}>{error}</div>}

      {step === 'compose' && (
        <div className={s.form}>
          {/* Type */}
          <div className={s.field}>
            <label className={s.label}>Type</label>
            <div className={s.typeToggle}>
              {['support', 'marketing'].map(t => (
                <button
                  key={t}
                  className={`${s.typeBtn} ${type === t ? s.typeBtnActive : ''}`}
                  onClick={() => setType(t)}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Campaign */}
          <div className={s.field}>
            <label className={s.label}>Campaign tag</label>
            <input
              className={s.input}
              value={campaign}
              onChange={e => setCampaign(e.target.value)}
              placeholder="e.g. renewal_outreach_2026-06"
            />
          </div>

          {/* Recipients */}
          <div className={s.field}>
            <label className={s.label}>
              Recipients
              {emails.length > 0 && <span className={s.count}>{emails.length} email{emails.length !== 1 ? 's' : ''}</span>}
            </label>
            <textarea
              className={`${s.textarea} ${s.recipientArea}`}
              value={rawEmails}
              onChange={e => setRawEmails(e.target.value)}
              placeholder="Paste emails — one per line or comma-separated"
            />
          </div>

          {/* Subject */}
          <div className={s.field}>
            <label className={s.label}>Subject</label>
            <input
              className={s.input}
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>

          {/* Body */}
          <div className={s.field}>
            <label className={s.label}>
              Body
              <span className={s.hint}>Variables: <code>{'{{name}}'}</code> <code>{'{{renewalLink}}'}</code> <code>{'{{email}}'}</code></span>
            </label>
            <textarea
              className={`${s.textarea} ${s.bodyArea}`}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={'Hi {{name}},\n\nYour renewal link: {{renewalLink}}'}
            />
          </div>

          <div className={s.actions}>
            <CtaButton
              onClick={handlePreview}
              disabled={!emails.length || !subject || !body}
            >
              Preview ({emails.length})
            </CtaButton>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className={s.previewStep}>
          <p className={s.previewIntro}>
            Previewing first {previews.length} of <strong>{emails.length}</strong> recipients.
          </p>

          {previews.map((p, i) => (
            <Card key={i} padding="md" className={s.previewCard}>
              <div className={s.previewTo}><strong>To:</strong> {p.email}{p.name ? ` (${p.name})` : ''}</div>
              <div className={s.previewSubject}><strong>Subject:</strong> {subject}</div>
              <pre className={s.previewBody}>{p.renderedBody}</pre>
            </Card>
          ))}

          <div className={s.actions}>
            <CtaButton variant="ghost" onClick={() => setStep('compose')}>← Edit</CtaButton>
            <CtaButton onClick={handleSend}>
              Send to {emails.length} recipient{emails.length !== 1 ? 's' : ''}
            </CtaButton>
          </div>
        </div>
      )}

      {step === 'sending' && (
        <div className={s.sending}>Sending to {emails.length} recipients…</div>
      )}
    </>
  );
}
