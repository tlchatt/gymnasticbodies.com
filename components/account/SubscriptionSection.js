/**
 * SubscriptionSection — read-only subscription summary (date-based status).
 *
 * Props (from lib/accountData.js → getSubscriptionSection):
 *   statusLabel : 'Active' | 'Trial' | 'Expired'   — date-derived label
 *   isActive    : boolean                           — future renewaldate === active
 *   renewalDate : string | null                     — raw renewaldate (ISO-ish) or null
 *   planName    : string                            — e.g. 'GymFit Membership'
 *   term        : string | null                     — 'monthly' | 'annually' | 'quarterly' | null
 *
 * CORE stub: labelled summary only. Interactive Cancel/Renew live in the shell.
 */
import { Badge } from '@/components/ui';
import { AccountCard, Row } from './accountUi';

function formatDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function SubscriptionSection({ statusLabel, isActive, renewalDate, planName, term }) {
    const badgeVariant = isActive ? (statusLabel === 'Trial' ? 'stripe' : 'current') : 'noncurrent';
    const renewLabel = isActive ? 'Renews' : 'Expired';

    return (
        <AccountCard
            title="Subscription"
            action={<Badge variant={badgeVariant}>{statusLabel}</Badge>}
        >
            <Row label="Status" value={statusLabel} />
            <Row label="Plan" value={planName} />
            <Row label="Term" value={term} />
            <Row label={renewLabel} value={formatDate(renewalDate) ?? 'No active membership'} />
        </AccountCard>
    );
}
