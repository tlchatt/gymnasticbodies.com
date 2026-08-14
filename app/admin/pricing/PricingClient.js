'use client';
import { useState } from 'react';
import { PageHeader, Card, CtaButton, Badge } from '@/components/ui';

// Display formatting of a single stored value (not price math).
const fmt = v => {
    const n = Number(v);
    if (!isFinite(n)) return '';
    return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
};

const label = { display: 'block', fontSize: 12, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: 6 };
const input = { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text)', padding: '10px 12px', fontSize: 14, fontFamily: 'var(--font-body)' };
const row = { display: 'flex', gap: 16, flexWrap: 'wrap' };
const field = { flex: '1 1 180px', minWidth: 160, marginBottom: 14 };
const hint = { fontSize: 12, color: 'var(--text-meta)', marginTop: 6 };

function Text({ lbl, value, onChange, type = 'text', placeholder, note }) {
    return (
        <div style={field}>
            <label style={label}>{lbl}</label>
            <input style={input} type={type} value={value ?? ''} placeholder={placeholder}
                onChange={e => onChange(e.target.value)} />
            {note && <p style={hint}>{note}</p>}
        </div>
    );
}

export default function PricingClient({ initial }) {
    const [subscribe, setSubscribe] = useState(initial.subscribe || {});
    const [renew, setRenew] = useState(initial.renewNoHistory || {});
    const [offers, setOffers] = useState(initial.offers || {});
    const [saving, setSaving] = useState(false);
    const [result, setResult] = useState(null);

    const patchOffer = (slug, key, val) => setOffers(o => ({ ...o, [slug]: { ...o[slug], [key]: val } }));
    const removeOffer = (slug) => setOffers(o => { const c = { ...o }; delete c[slug]; return c; });
    const addOffer = () => {
        const slug = (prompt('New offer slug (letters, numbers, dashes) — becomes /offer/<slug>') || '').trim().toLowerCase();
        if (!slug) return;
        if (!/^[a-z0-9-]+$/.test(slug)) { alert('Slug must be letters, numbers, and dashes only.'); return; }
        if (offers[slug]) { alert('An offer with that slug already exists.'); return; }
        setOffers(o => ({ ...o, [slug]: {
            kind: 'campaign', active: true, amount: 15, term: 'monthly', regularRate: 50,
            campaign: `campaign_${slug}`, endDate: '', headline: 'Welcome Back.', headlineAccent: 'Special Offer.',
            subheadline: 'A special rate — {{offerPrice}}/month to rejoin.', ctaLabel: 'Rejoin for {{offerPrice}}/month',
            metaTitle: 'Special Offer | GymnasticBodies',
        } }));
    };

    const save = async () => {
        setSaving(true); setResult(null);
        try {
            const res = await fetch('/api/admin/pricing', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ pricing: { subscribe, renewNoHistory: renew, offers } }),
            });
            const data = await res.json();
            if (!res.ok) {
                setResult({ ok: false, msg: (data.details ? data.details.join('; ') : data.error) || 'Save failed', detail: data.detail });
            } else {
                setResult({ ok: true, msg: data.mintedPriceId ? `Saved. New Stripe Price minted: ${data.mintedPriceId}` : 'Saved.' });
                if (data.pricing) { setSubscribe(data.pricing.subscribe); setRenew(data.pricing.renewNoHistory); setOffers(data.pricing.offers); }
            }
        } catch (e) {
            setResult({ ok: false, msg: e.message });
        } finally { setSaving(false); }
    };

    const subChanged = Number(subscribe.amount) !== Number(initial.subscribe?.amount);

    return (
        <div style={{ maxWidth: 900, fontFamily: 'var(--font-body)' }}>
            <PageHeader title="Pricing">
                <CtaButton size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</CtaButton>
            </PageHeader>

            {result && (
                <div style={{ margin: '0 0 18px', padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${result.ok ? 'var(--border-accent)' : '#ff8080'}`,
                    color: result.ok ? 'var(--text)' : '#ff8080', background: 'var(--bg-surface)' }}>
                    {result.msg}{result.detail ? ` — ${result.detail}` : ''}
                </div>
            )}

            {/* ── 1. Subscribe ── */}
            <Card padding="lg">
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '0 0 4px' }}>1 · Normal Subscribe</h2>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 16px', fontSize: 14 }}>
                    New signups. This is a real Stripe Price — changing the amount mints a new Price for new
                    signups; everyone already subscribed keeps their current rate. Preview: <strong>{fmt(subscribe.amount)}</strong> / {subscribe.term}
                </p>
                <div style={row}>
                    <Text lbl="Amount (USD)" type="number" value={subscribe.amount}
                        onChange={v => setSubscribe(s => ({ ...s, amount: v }))} />
                    <Text lbl="Term" value={subscribe.term}
                        onChange={v => setSubscribe(s => ({ ...s, term: v }))} note="monthly · quarterly · annually" />
                    <Text lbl="Free trial (days)" type="number" value={subscribe.trialDays}
                        onChange={v => setSubscribe(s => ({ ...s, trialDays: Number(v) }))} />
                </div>
                <p style={{ ...hint, color: subChanged ? 'var(--accent-light)' : 'var(--text-meta)' }}>
                    Current Stripe Price: {subscribe.stripePriceId || '(none)'}
                    {subChanged && ' — amount changed: a new Stripe Price will be minted on save.'}
                </p>
            </Card>

            {/* ── 2. Renew ── */}
            <div style={{ height: 18 }} />
            <Card padding="lg">
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: '0 0 4px' }}>2 · Renew</h2>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 16px', fontSize: 14 }}>
                    Every lapsed member renews at this one rate (historical rates were retired — a flat rate
                    never overcharges a returning member vs a new one). Monthly only.
                    Preview: <strong>{fmt(renew.amount)}</strong> / {renew.term}
                </p>
                <div style={row}>
                    <Text lbl="Renew rate (USD)" type="number" value={renew.amount}
                        onChange={v => setRenew(r => ({ ...r, amount: v }))} />
                    <Text lbl="Term" value={renew.term}
                        onChange={v => setRenew(r => ({ ...r, term: v }))} />
                </div>
            </Card>

            {/* ── 3. Offers ── */}
            <div style={{ height: 18 }} />
            <Card padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, margin: 0 }}>3 · Offers</h2>
                    <CtaButton size="sm" variant="ghost" onClick={addOffer}>+ Add Offer</CtaButton>
                </div>
                <p style={{ color: 'var(--text-muted)', margin: '0 0 16px', fontSize: 14 }}>
                    Each offer is live at <code>/offer/&lt;slug&gt;</code>. Prices in copy use tokens
                    <code> {'{{offerPrice}}'} </code> / <code>{'{{offerRegularRate}}'}</code> — never type a literal.
                </p>
                {Object.keys(offers).length === 0 && <p style={{ color: 'var(--text-meta)' }}>No offers.</p>}
                {Object.entries(offers).map(([slug, o]) => (
                    <div key={slug} style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>/offer/{slug}</strong>
                                <Badge variant={o.kind === 'legacy' ? 'accent' : 'normal'}>{o.kind || 'campaign'}</Badge>
                                {o.active === false && <Badge variant="closed">inactive</Badge>}
                            </div>
                            <button onClick={() => removeOffer(slug)} style={{ background: 'none', border: 'none', color: '#ff8080', cursor: 'pointer', fontSize: 13 }}>Delete</button>
                        </div>
                        <div style={row}>
                            <Text lbl="Amount (USD)" type="number" value={o.amount} onChange={v => patchOffer(slug, 'amount', v)} note={`Preview ${fmt(o.amount)}`} />
                            <Text lbl="Term" value={o.term} onChange={v => patchOffer(slug, 'term', v)} />
                            <Text lbl="Regular rate (for copy)" type="number" value={o.regularRate} onChange={v => patchOffer(slug, 'regularRate', v)} note={`{{offerRegularRate}} = ${fmt(o.regularRate)}`} />
                        </div>
                        <div style={row}>
                            <Text lbl="Campaign tag" value={o.campaign} onChange={v => patchOffer(slug, 'campaign', v)} />
                            <Text lbl="End date (YYYY-MM-DD)" value={o.endDate} onChange={v => patchOffer(slug, 'endDate', v)} />
                            <div style={field}>
                                <label style={label}>Active</label>
                                <select style={input} value={o.active === false ? 'no' : 'yes'} onChange={e => patchOffer(slug, 'active', e.target.value === 'yes')}>
                                    <option value="yes">Active</option>
                                    <option value="no">Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div style={row}>
                            <Text lbl="Headline" value={o.headline} onChange={v => patchOffer(slug, 'headline', v)} />
                            <Text lbl="Headline accent" value={o.headlineAccent} onChange={v => patchOffer(slug, 'headlineAccent', v)} />
                        </div>
                        <Text lbl="Subheadline (supports {{offerPrice}})" value={o.subheadline} onChange={v => patchOffer(slug, 'subheadline', v)} />
                        <div style={row}>
                            <Text lbl="CTA label (supports {{offerPrice}})" value={o.ctaLabel} onChange={v => patchOffer(slug, 'ctaLabel', v)} />
                            <Text lbl="Meta title" value={o.metaTitle} onChange={v => patchOffer(slug, 'metaTitle', v)} />
                        </div>
                    </div>
                ))}
            </Card>

            <div style={{ height: 22 }} />
            <CtaButton onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</CtaButton>
        </div>
    );
}
