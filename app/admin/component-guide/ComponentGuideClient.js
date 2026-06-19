'use client';
import { Badge, Tabs, PageHeader, CtaButton, Card } from '@/components/ui';
import { useState } from 'react';

const SECTIONS = [
    { id: 'badge', label: 'Badge' },
    { id: 'tabs', label: 'Tabs' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'card', label: 'Card' },
    { id: 'typography', label: 'Typography' },
    { id: 'colors', label: 'Colors' },
    { id: 'spacing', label: 'Spacing' },
];

const BADGE_VARIANTS = [
    ['open', 'replied', 'closed', 'pending', 'resolved'],
    ['current', 'noncurrent', 'stripe', 'auth_net', 'subscriber', 'purchased', 'lapsed', 'inactive'],
    ['urgent', 'high', 'normal', 'low'],
    ['accent', 'case', 'support', 'marketing'],
];

function Section({ id, title, children }) {
    return (
        <section id={id} style={{ marginBottom: 48 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{title}</h2>
            <div style={{ height: 1, background: 'var(--border-subtle)', marginBottom: 24 }} />
            {children}
        </section>
    );
}

function CodeBlock({ code }) {
    return (
        <pre style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontSize: 12,
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
            overflowX: 'auto',
            marginTop: 12,
        }}>
            <code>{code}</code>
        </pre>
    );
}

function Row({ label, children, code }) {
    return (
        <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 12, color: 'var(--text-subtle)', marginBottom: 8, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{children}</div>
            {code && <CodeBlock code={code} />}
        </div>
    );
}

const COLOR_TOKENS = [
    { token: '--bg-base', label: 'bg-base', hex: '#0e0e0e' },
    { token: '--bg-surface', label: 'bg-surface', hex: '#151515' },
    { token: '--bg-raised', label: 'bg-raised', hex: '#1a1a1a' },
    { token: '--bg-overlay', label: 'bg-overlay', hex: '#222222' },
    { token: '--accent', label: 'accent', hex: '#f05621' },
    { token: '--accent-light', label: 'accent-light', hex: '#fcb14e' },
    { token: '--text', label: 'text', hex: '#ffffff' },
    { token: '--text-muted', label: 'text-muted', hex: 'rgba(255,255,255,0.65)' },
    { token: '--text-subtle', label: 'text-subtle', hex: 'rgba(255,255,255,0.40)' },
    { token: '--text-meta', label: 'text-meta', hex: '#666666' },
    { token: '--border-subtle', label: 'border-subtle', hex: 'rgba(255,255,255,0.06)' },
    { token: '--border-accent', label: 'border-accent', hex: 'rgba(240,86,33,0.35)' },
];

export default function ComponentGuideClient() {
    const [activeTab, setActiveTab] = useState('open');

    return (
        <div style={{ padding: '32px 32px 64px', maxWidth: 880, fontFamily: 'var(--font-body)' }}>
            <PageHeader title="Component Guide">
                <span style={{ fontSize: 13, color: 'var(--text-subtle)' }}>Design system reference for admin UI</span>
            </PageHeader>

            {/* Quick nav */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 48 }}>
                {SECTIONS.map(s => (
                    <a key={s.id} href={`#${s.id}`} style={{
                        padding: '6px 14px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-pill)',
                        color: 'var(--text-muted)',
                        fontSize: 13,
                        textDecoration: 'none',
                    }}>{s.label}</a>
                ))}
            </div>

            {/* Badge */}
            <Section id="badge" title="Badge">
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    Status, priority, and segment pills. Import: <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{'import { Badge } from \'@/components/ui\''}</code>
                </p>
                {BADGE_VARIANTS.map((group, i) => (
                    <Row key={i} label={['Status', 'User segment', 'Priority', 'Type'][i]}>
                        {group.map(v => <Badge key={v} variant={v}>{v}</Badge>)}
                    </Row>
                ))}
                <CodeBlock code={`<Badge variant="open">open</Badge>\n<Badge variant="noncurrent">noncurrent</Badge>\n<Badge variant="urgent">urgent</Badge>\n<Badge variant="case">Case</Badge>`} />
            </Section>

            {/* Tabs */}
            <Section id="tabs" title="Tabs">
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    Controlled tab bar. Import: <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{'import { Tabs } from \'@/components/ui\''}</code>
                </p>
                <Tabs
                    tabs={[
                        { label: 'All', value: '' },
                        { label: 'Open', value: 'open' },
                        { label: 'Pending', value: 'pending' },
                        { label: 'Resolved', value: 'resolved' },
                    ]}
                    value={activeTab}
                    onChange={setActiveTab}
                />
                <CodeBlock code={`const TABS = [{ label: 'All', value: '' }, { label: 'Open', value: 'open' }];\n<Tabs tabs={TABS} value={tab} onChange={setTab} />`} />
            </Section>

            {/* Buttons */}
            <Section id="buttons" title="CtaButton">
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    Renders as <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{'<Link>'}</code> when <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>href</code> is given, otherwise <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>{'<button>'}</code>.
                </p>
                <Row label="Variants">
                    <CtaButton onClick={() => {}}>Solid (default)</CtaButton>
                    <CtaButton variant="ghost" onClick={() => {}}>Ghost</CtaButton>
                </Row>
                <Row label="Sizes">
                    <CtaButton size="sm" onClick={() => {}}>Small</CtaButton>
                    <CtaButton size="md" onClick={() => {}}>Medium</CtaButton>
                    <CtaButton size="lg" onClick={() => {}}>Large</CtaButton>
                </Row>
                <Row label="States">
                    <CtaButton disabled onClick={() => {}}>Disabled</CtaButton>
                    <CtaButton fullWidth onClick={() => {}} size="sm">Full Width</CtaButton>
                </Row>
                <CodeBlock code={`<CtaButton href="/subscribe">Get Started</CtaButton>\n<CtaButton onClick={save} size="sm" disabled={saving}>Save</CtaButton>\n<CtaButton variant="ghost" href="/login">Sign In</CtaButton>`} />
            </Section>

            {/* Card */}
            <Section id="card" title="Card">
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    Dark bordered surface container.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <Card>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Default card</p>
                    </Card>
                    <Card variant="accent">
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Accent variant</p>
                    </Card>
                    <Card padding="lg">
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Padding lg</p>
                    </Card>
                    <Card padding="sm">
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Padding sm</p>
                    </Card>
                </div>
                <CodeBlock code={`<Card>Default</Card>\n<Card variant="accent" padding="lg">Highlighted</Card>\n<Card padding="none">Custom padding</Card>`} />
            </Section>

            {/* Typography */}
            <Section id="typography" title="Typography">
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    Two fonts via <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>lib/fonts.js</code>. Apply to a page shell via className.
                </p>
                <div style={{ marginBottom: 20 }}>
                    {[
                        { tag: 'Display / H1', style: { fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 48, color: 'var(--text)', lineHeight: 1 }, text: 'Barlow Condensed 900' },
                        { tag: 'H2 / Section', style: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color: 'var(--text)' }, text: 'Barlow Condensed 700' },
                        { tag: 'H3 / Card title', style: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--text)' }, text: 'Barlow Condensed 700 — 22px' },
                        { tag: 'Body', style: { fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6 }, text: 'DM Sans Regular — body copy, labels, metadata. Use for all paragraph text.' },
                        { tag: 'Label / Caption', style: { fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 13, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }, text: 'DM Sans 500 Uppercase' },
                    ].map(({ tag, style, text }) => (
                        <div key={tag} style={{ marginBottom: 24 }}>
                            <p style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'monospace', marginBottom: 4 }}>{tag}</p>
                            <p style={style}>{text}</p>
                        </div>
                    ))}
                </div>
                <CodeBlock code={`import { barlow, dm } from '@/lib/fonts';\n\n// Apply to wrapper:\n<div className={\`\${barlow.variable} \${dm.variable}\`}>\n  // now var(--font-display) and var(--font-body) resolve correctly\n</div>`} />
            </Section>

            {/* Colors */}
            <Section id="colors" title="Colors">
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    All tokens from <code style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>app/globals.css</code>. Never hardcode hex values — use the token.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                    {COLOR_TOKENS.map(({ token, label, hex }) => (
                        <div key={token}>
                            <div style={{ height: 48, background: `var(${token})`, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', marginBottom: 6 }} />
                            <p style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'monospace' }}>{token}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'monospace' }}>{hex}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Spacing */}
            <Section id="spacing" title="Radius Tokens">
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                    Use radius tokens for consistent rounding.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {[
                        { token: '--radius-sm', label: '6px', example: { width: 80, height: 32, borderRadius: 'var(--radius-sm)' } },
                        { token: '--radius-md', label: '10px', example: { width: 80, height: 48, borderRadius: 'var(--radius-md)' } },
                        { token: '--radius-lg', label: '16px', example: { width: 80, height: 64, borderRadius: 'var(--radius-lg)' } },
                        { token: '--radius-pill', label: '100px', example: { width: 80, height: 32, borderRadius: 'var(--radius-pill)' } },
                    ].map(({ token, label, example }) => (
                        <div key={token} style={{ textAlign: 'center' }}>
                            <div style={{ ...example, background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)', marginBottom: 8 }} />
                            <p style={{ fontSize: 11, color: 'var(--text-subtle)', fontFamily: 'monospace' }}>{token}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-meta)', fontFamily: 'monospace' }}>{label}</p>
                        </div>
                    ))}
                </div>
            </Section>
        </div>
    );
}
