// Shared style objects + formatters for the read-only forum views.
// Layout is fluid (clamp / flex-wrap) so these render as server components with no hooks.

export const sectionStyle = {
    backgroundColor: 'var(--bg-base)',
    padding: 'clamp(2.5rem, 6vw, 4.5rem) clamp(1.25rem, 4vw, 2rem) clamp(2rem, 5vw, 3.5rem)',
};

export const innerStyle = { maxWidth: 'var(--content-max)', margin: '0 auto' };

export const h1Style = {
    color: 'var(--text)',
    fontSize: 'clamp(1.9rem, 5vw, 3rem)',
    fontFamily: 'var(--font-display)',
    fontWeight: 900,
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
    textTransform: 'uppercase',
    overflowWrap: 'anywhere',
    marginBottom: '1.5rem',
};

export const cardStyle = {
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
};

// Secondary text: smaller + lighter weight, never a dimmer-than-AA colour.
export const metaStyle = {
    color: 'var(--text-dim)',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.5,
};

export const titleLinkStyle = {
    color: 'var(--text)',
    fontSize: '1.05rem',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    lineHeight: 1.35,
    overflowWrap: 'anywhere',
};

export const accentLinkStyle = { color: 'var(--accent-light)', textDecoration: 'underline' };

export function formatForumDate(value) {
    if (!value) return '';
    return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

export function formatCount(value) {
    return Number(value || 0).toLocaleString('en-US');
}
