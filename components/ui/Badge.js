import s from './Badge.module.css';

/**
 * Badge — status / type / priority pill.
 *
 * variant:
 *   Status      → 'open' | 'replied' | 'closed' | 'pending' | 'resolved'
 *   Migration   → 'stripe' | 'active_current' | 'active_expired' | 'inactive' | 'auth_net_subscriber'
 *   Priority    → 'urgent' | 'high' | 'normal' | 'low'
 *   Special     → 'accent' | 'case'  (orange outlined, e.g. CASE link badge)
 *
 * Usage:
 *   <Badge variant="open">open</Badge>
 *   <Badge variant="active_expired">active expired</Badge>
 *   <Badge variant="urgent">urgent</Badge>
 */

const CLASS_MAP = {
  // Status
  open:     s.open,
  replied:  s.replied,
  closed:   s.closed,
  pending:  s.pending,
  resolved: s.resolved,
  // Migration type (current/noncurrent)
  current:    s.current,
  noncurrent: s.noncurrent,
  // Customer segment
  stripe:     s.stripe,
  auth_net:   s.authNet,
  subscriber: s.current,
  purchased:  s.purchased,
  lapsed:     s.noncurrent,
  inactive:   s.inactive,
  // Legacy values (kept for any existing data in transit)
  active_current:       s.current,
  active_expired:       s.noncurrent,
  auth_net_subscriber:  s.authNet,
  // Priority
  urgent: s.urgent,
  high:   s.high,
  normal: s.normal,
  low:    s.low,
  // Outbound type
  support:   s.support,
  marketing: s.marketing,
  // Special
  accent: s.accent,
  case:   s.accent,
};

export default function Badge({ variant = 'default', children, className = '' }) {
  const cls = CLASS_MAP[variant] ?? s.default;
  return (
    <span className={`${s.badge} ${cls}${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  );
}
