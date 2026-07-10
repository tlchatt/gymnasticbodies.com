'use client';

// Presentational, reusable across the case screen and the user detail page.
// Merges two sources into one time-sorted feed:
//   - adminActions: app_logs rows where event LIKE 'admin.%' (with `data` jsonb)
//   - outbound:     outbound_emails rows (marketing offers + support sends)
// No data fetching here — the server routes pass both arrays in.

function fmtDateTime(str) {
  if (!str) return '';
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function actionLabel(event, data = {}) {
  switch (event) {
    case 'admin.extend_subscription':
      return `Extended subscription +${data.days ?? 30} days${data.method ? ` (${data.method})` : ''}`;
    case 'admin.grant_access':
      return data.days === 'indefinite'
        ? 'Granted indefinite access'
        : `Granted ${data.days ?? 30}-day access`;
    case 'admin.password_reset_sent':
      return 'Sent password reset email';
    case 'admin.temp_password_set':
      return `Set temp password${data.created ? ' (new login created)' : ''}`;
    default:
      return event.replace(/^admin\./, '').replace(/_/g, ' ');
  }
}

const wrap      = { display: 'flex', flexDirection: 'column', gap: 8 };
const item      = { display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' };
const topRow    = { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' };
const labelCss  = { fontSize: 12.5, color: 'var(--text)', fontWeight: 500 };
const metaCss   = { fontSize: 11, color: 'var(--text-subtle)' };
const byCss      = { fontSize: 11, color: 'var(--text-meta)' };
const emptyCss  = { fontSize: 12, color: 'var(--text-subtle)' };

const badgeBase = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '1px 6px', borderRadius: 'var(--radius-pill)' };
const badgeAction    = { ...badgeBase, background: 'rgba(240,86,33,0.14)', color: 'var(--accent-light)' };
const badgeMarketing = { ...badgeBase, background: 'rgba(168,85,247,0.16)', color: '#c99bf5' };
const badgeSupport   = { ...badgeBase, background: 'rgba(59,130,246,0.16)', color: '#8fbcff' };

export default function AccountHistory({ adminActions = [], outbound = [], title = 'Account History', limit = 20 }) {
  const items = [
    ...adminActions.map((a) => ({
      key: `a-${a.id}`,
      time: a.ts,
      kind: 'action',
      label: actionLabel(a.event, a.data || {}),
      by: (a.data && a.data.adminEmail) || null,
    })),
    ...outbound.map((o) => ({
      key: `o-${o.id}`,
      time: o.sentAt,
      kind: o.type === 'marketing' ? 'marketing' : 'support',
      label: o.subject,
      campaign: o.campaign,
      caseId: o.caseId,
    })),
  ]
    .filter((i) => i.time)
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, limit);

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-subtle)', marginBottom: 10 }}>
        {title}
      </div>
      {items.length === 0 ? (
        <div style={emptyCss}>No admin actions or emails yet.</div>
      ) : (
        <div style={wrap}>
          {items.map((i) => (
            <div key={i.key} style={item}>
              <div style={topRow}>
                {i.kind === 'action'    && <span style={badgeAction}>action</span>}
                {i.kind === 'marketing' && <span style={badgeMarketing}>offer</span>}
                {i.kind === 'support'   && <span style={badgeSupport}>email</span>}
                <span style={labelCss}>{i.label}</span>
              </div>
              <div style={topRow}>
                <span style={metaCss}>{fmtDateTime(i.time)}</span>
                {i.campaign && <span style={byCss}>· {String(i.campaign).replace(/_/g, ' ')}</span>}
                {i.by && <span style={byCss}>· by {i.by}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
