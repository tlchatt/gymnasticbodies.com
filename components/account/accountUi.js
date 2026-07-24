/**
 * components/account/accountUi.js — shared presentational primitives for the
 * My Account section stubs. Light theme to match the existing /accountDetails page
 * (white boxShadow cards, gray headings, #f05621 accent). Inline styles only.
 *
 * Exports:
 *   <AccountCard title action>…</AccountCard>  — titled white card wrapper
 *   <Row label value />                         — one labelled value line
 *   <StatTile label value />                    — small stat block
 *   ACCENT                                      — brand accent color constant
 */

export const ACCENT = '#f05621';

const cardStyle = {
    width: '100%',
    boxShadow: '0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2)',
    padding: '24px',
    borderRadius: '4px',
    background: '#fff',
    boxSizing: 'border-box',
};

const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    gap: '12px',
};

const titleStyle = {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#333',
    margin: 0,
};

const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: '16px',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
};

const rowLabelStyle = { color: '#666', fontSize: '0.95rem' };
const rowValueStyle = { color: '#222', fontSize: '0.95rem', fontWeight: 500, textAlign: 'right' };

export function AccountCard({ title, action, children }) {
    return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <h3 style={titleStyle}>{title}</h3>
                {action ?? null}
            </div>
            {children}
        </div>
    );
}

export function Row({ label, value }) {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div style={rowStyle}>
            <span style={rowLabelStyle}>{label}</span>
            <span style={rowValueStyle}>{value}</span>
        </div>
    );
}

export function StatTile({ label, value }) {
    return (
        <div style={{
            background: '#faf7f5',
            border: '1px solid #f0e6e0',
            borderRadius: '8px',
            padding: '14px 18px',
            minWidth: '110px',
        }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: ACCENT }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '2px' }}>{label}</div>
        </div>
    );
}
