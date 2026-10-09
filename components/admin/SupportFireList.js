'use client';
import { useState, useEffect } from 'react';
import SupportPlayCard from '@/components/admin/SupportPlayCard';
import { Tabs, CtaButton } from '@/components/ui';
import content from '@/data/content/adminSupport.json';

// A list of support agent review cards. Used by /admin/support (with the status tabs) and the
// case page (one case's latest play). The server page passes the first load; tab changes and
// card actions reload from GET /api/support/fires. While a card is scheduled, one interval ticks
// the countdown each second and re-reads the queue every 10s so a fired play shows its result.
export default function SupportFireList({ initialFires, initialStatus = 'posted', caseId = null, showTabs = true, latestOnly = false }) {
  const [fires, setFires] = useState(initialFires || []);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  async function load(nextStatus = status) {
    const qs = new URLSearchParams();
    if (nextStatus) qs.set('status', nextStatus);
    if (caseId) qs.set('caseId', String(caseId));
    const res = await fetch(`/api/support/fires?${qs}`, { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setFires(j.fires || []);
  }

  async function changeTab(v) {
    setStatus(v); setLoading(true);
    try { await load(v); } finally { setLoading(false); }
  }

  const shown = latestOnly ? fires.slice(0, 1) : fires;
  const hasLive = shown.some((f) => f.status === 'scheduled' || f.status === 'firing');

  // Syncs with the clock (external system) only while a countdown is on screen.
  useEffect(() => {
    if (!hasLive) return undefined;
    let ticks = 0;
    const id = setInterval(() => {
      setNow(Date.now());
      ticks += 1;
      if (ticks % 10 === 0) load();
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLive, status, caseId]);

  const bar = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 };
  const empty = { color: 'var(--text-subtle)', fontSize: 14, padding: '24px 0' };

  return (
    <div>
      <div style={bar}>
        {showTabs ? <Tabs tabs={content.tabs} value={status} onChange={changeTab} /> : <span />}
        <CtaButton size="sm" variant="ghost" onClick={() => changeTab(status)} disabled={loading}>{content.page.refresh}</CtaButton>
      </div>
      {loading && <div style={empty}>{content.page.loading}</div>}
      {!loading && shown.length === 0 && <div style={empty}>{caseId ? content.card.noFireForCase : content.page.empty}</div>}
      {!loading && shown.map((f) => <SupportPlayCard key={f.id} fire={f} now={now} onChanged={() => load()} />)}
    </div>
  );
}
