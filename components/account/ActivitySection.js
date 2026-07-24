/**
 * ActivitySection — "Account Activity" timeline.
 *
 * Surfaces support/admin ACTIONS taken on the account (membership credits, access
 * grants/extensions, renewals, cancellations, refunds, password resets) that are
 * otherwise invisible to the member. Read-only. Light theme, inline styles only,
 * wrapped in the shared <AccountCard> to match the rest of /accountDetails.
 *
 * Props (from lib/accountData.js → getActivitySection):
 *   items : Array<{
 *     date   : string | number,   // ISO string / ms epoch — when the action happened
 *     label  : string,            // short headline e.g. 'Membership credit applied'
 *     detail : string             // one-line explanation
 *   }>                            // pre-sorted NEWEST-FIRST
 */
import { AccountCard, ACCENT } from './accountUi';

function formatDate(value) {
    if (value === null || value === undefined) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const listStyle = {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
};

// Each item is a timeline node: dot + connector line on the left, content on the right.
const itemStyle = {
    position: 'relative',
    display: 'flex',
    gap: '14px',
    paddingBottom: '18px',
};

const railStyle = {
    position: 'relative',
    flex: '0 0 auto',
    width: '12px',
    display: 'flex',
    justifyContent: 'center',
};

const dotStyle = {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: ACCENT,
    marginTop: '4px',
    zIndex: 1,
    boxShadow: '0 0 0 3px #fff',
};

const lineStyle = {
    position: 'absolute',
    top: '4px',
    bottom: '-8px',
    left: '50%',
    width: '2px',
    marginLeft: '-1px',
    background: '#f0e6e0',
};

const dateStyle = { fontSize: '0.78rem', color: '#999', marginBottom: '2px' };
const labelStyle = { fontSize: '0.98rem', fontWeight: 600, color: '#333' };
const detailStyle = { fontSize: '0.9rem', color: '#666', marginTop: '3px', lineHeight: 1.4 };

export default function ActivitySection({ items = [] }) {
    if (!items.length) return null;

    return (
        <AccountCard title="Account Activity">
            <ul style={listStyle}>
                {items.map((it, i) => {
                    const isLast = i === items.length - 1;
                    return (
                        <li key={i} style={isLast ? { ...itemStyle, paddingBottom: 0 } : itemStyle}>
                            <div style={railStyle}>
                                {!isLast && <span style={lineStyle} />}
                                <span style={dotStyle} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={dateStyle}>{formatDate(it.date)}</div>
                                <div style={labelStyle}>{it.label}</div>
                                {it.detail ? <div style={detailStyle}>{it.detail}</div> : null}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </AccountCard>
    );
}
