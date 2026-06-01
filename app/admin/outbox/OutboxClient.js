'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge, PageHeader, CtaButton } from '@/components/ui';
import s from './outbox.module.css';

function fmtDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function campaignLabel(campaign) {
  if (!campaign) return null;
  return campaign.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function OutboxClient() {
  const [outbound, setOutbound] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetch('/api/admin/outbound')
      .then(r => r.json())
      .then(d => setOutbound(d.outbound ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Outbox">
        <CtaButton size="sm" href="/admin/outbound/compose">Compose</CtaButton>
      </PageHeader>

      {loading ? (
        <div className={s.empty}>Loading…</div>
      ) : outbound.length === 0 ? (
        <div className={s.empty}>No outbound emails recorded.</div>
      ) : (
        <div className={s.list}>
          {outbound.map((o) => (
            <div key={o.id} className={s.row}>
              <span className={s.sender}>
                {o.userName && o.userName !== 'N/A' ? o.userName : o.toEmail}
              </span>

              <span className={s.subjectCell}>
                <span className={s.subjectText}>{o.subject}</span>
                {o.caseId && (
                  <Link href={`/admin/cases/${o.caseId}`} className={s.caseBadgeLink}>
                    <Badge variant="case">Case</Badge>
                  </Link>
                )}
              </span>

              <Badge variant={o.type}>{o.type}</Badge>

              {o.campaign && (
                <span className={s.campaignTag}>{campaignLabel(o.campaign)}</span>
              )}

              <span className={s.date}>{fmtDate(o.sentAt)}</span>

              <span className={s.toEmail}>{o.toEmail}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
