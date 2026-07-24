'use client'
import { useState } from 'react';

import SubscriptionSection from '@/components/account/SubscriptionSection';
import PaymentSection from '@/components/account/PaymentSection';
import ActivitySection from '@/components/account/ActivitySection';
import WorkoutHistorySection from '@/components/account/WorkoutHistorySection';
import LevelsSection from '@/components/account/LevelsSection';
import ThriveSection from '@/components/account/ThriveSection';
import PreferencesSection from '@/components/account/PreferencesSection';
import SupportSection from '@/components/account/SupportSection';
import { AccountCard, Row } from '@/components/account/accountUi';

/**
 * AccountDetailsComp — modular My Account shell.
 *
 * Each dashboard section is fetched independently server-side (lib/accountData.js)
 * and passed as its own prop. The local <Section> wrapper hides a section whose data
 * prop is null/undefined, so one empty or failed source never blanks the page.
 *
 * Subscription "Active" is derived date-based (lib/subscription) via the server-computed
 * impInfo.isActive flag — never the raw user_setting.status string. The interactive
 * Cancel / Renew controls, Profile edit, and Security actions remain in this shell.
 */
export default function AccountDetailsComp({
    data,
    profile,
    userId,
    token,
    subscription,
    payment,
    activity,
    workoutHistory,
    levels,
    thrive,
    preferences,
    support,
    emailChanged,
    emailError,
}) {
    const titleStyle = { color: '#656464', padding: '24px 0 0' }

    return (
        <>
            <h2 style={{ ...titleStyle, textAlign: 'center' }} id='responsive-dialog-title'>
                ACCOUNT
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px', maxWidth: '760px', marginLeft: 'auto', marginRight: 'auto' }}>
                <Section data={subscription}>
                    <SubscriptionSection {...(subscription ?? {})} />
                </Section>

                <Section data={activity}>
                    <ActivitySection {...(activity ?? {})} />
                </Section>

                <SubscriptionActions data={data} userId={userId} token={token} />

                <Section data={payment}>
                    <PaymentSection {...(payment ?? {})} userId={userId} />
                </Section>

                <DisplayProfile profile={profile} userId={userId} />
                <DisplaySecurity profile={profile} emailChanged={emailChanged} emailError={emailError} userId={userId} />

                <Section data={workoutHistory}>
                    <WorkoutHistorySection {...(workoutHistory ?? {})} />
                </Section>
                <Section data={levels}>
                    <LevelsSection {...(levels ?? {})} />
                </Section>
                <Section data={thrive}>
                    <ThriveSection {...(thrive ?? {})} />
                </Section>
                <Section data={preferences}>
                    <PreferencesSection {...(preferences ?? {})} />
                </Section>
                <Section data={support}>
                    <SupportSection {...(support ?? {})} userId={userId} />
                </Section>
            </div>
        </>
    )
}

// ─── Resilient section wrapper ────────────────────────────────────────────────
// Renders nothing when its data prop is null/undefined. Fetch-level try/catch
// already turns any failure into null, so a broken/empty section simply hides.
function Section({ data, children }) {
    if (data === null || data === undefined) return null
    return children
}

// ─── Subscription actions (Cancel / Cancel-trial / Renew) ─────────────────────
// Interactive controls only — the read-only summary lives in <SubscriptionSection>.
// Gated on the date-based isActive flag (server-computed impInfo.isActive), with the
// classifier's noncurrent guard kept as belt-and-suspenders.
function SubscriptionActions({ data, userId, token }) {
    const { impInfo, migrationStatus } = data ?? {}

    const [cancelConfirming, setCancelConfirming] = useState(false)
    const [cancelledUntil, setCancelledUntil] = useState('')
    const [cancelling, setCancelling] = useState(false)
    const [trialCancelled, setTrialCancelled] = useState(false)
    const [trialCancelling, setTrialCancelling] = useState(false)

    const handleCancelTrial = async () => {
        if (!impInfo?.subscriptionId) return
        setTrialCancelling(true)
        try {
            const res = await fetch('/api/stripe/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId: impInfo.subscriptionId }),
            })
            const result = await res.json()
            if (result.success) {
                setTrialCancelled(true)
            } else {
                alert(result.message ?? 'Cancellation failed. Please try again.')
            }
        } catch {
            alert('Something went wrong. Please try again.')
        } finally {
            setTrialCancelling(false)
        }
    }

    const handleCancelSubscription = async () => {
        setCancelling(true)
        try {
            const res = await fetch('/api/stripe/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId: impInfo.subscriptionId }),
            })
            const result = await res.json()
            if (result.success) {
                const d = result.accessUntil
                    ? new Date(result.accessUntil * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'the end of your current billing period'
                setCancelledUntil(d)
                setCancelConfirming(false)
            } else {
                alert(result.message ?? 'Cancellation failed. Please try again.')
            }
        } catch {
            alert('Something went wrong. Please try again.')
        } finally {
            setCancelling(false)
        }
    }

    // Date-based active flag (server-computed), with the classifier guard kept.
    const isActive = (impInfo?.isActive ?? true) && migrationStatus !== 'noncurrent'
    const isTrial = !!impInfo?.trial
    const hasStripeSub = impInfo?.subscriptionId?.startsWith?.('sub_')

    // getDateString returns the literal strings 'Invalid Date' / 'N/A' on junk input —
    // never render those into the cancel-confirm copy.
    const formattedNextPayment = impInfo?.redableNextPaymentDate
    const accessUntilText = (formattedNextPayment && formattedNextPayment !== 'Invalid Date' && formattedNextPayment !== 'N/A')
        ? formattedNextPayment
        : 'the end of your current billing period'

    // Nothing actionable: active membership with no Stripe sub to cancel → render nothing.
    if (isActive && !isTrial && !hasStripeSub) return null

    return (
        <AccountCard title='Manage Subscription'>
            {/* Renew (expired / noncurrent) */}
            {!isActive && (
                <a
                    href={`/renew?email=${encodeURIComponent(impInfo?.email || '')}&token=${encodeURIComponent(token || '')}&userId=${encodeURIComponent(userId || '')}`}
                    style={{
                        display: 'inline-block',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #fcb14e 0%, #f05621 100%)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        textDecoration: 'none',
                    }}
                >
                    Renew Subscription
                </a>
            )}

            {/* Cancel active (non-trial) Stripe subscription */}
            {isActive && !isTrial && hasStripeSub && (
                cancelledUntil ? (
                    <p style={{ fontSize: '0.9rem', margin: 0, color: '#4caf50' }}>
                        Subscription cancelled. Access continues until {cancelledUntil}.
                    </p>
                ) : cancelConfirming ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={{ fontSize: '0.9rem', margin: 0, color: '#555' }}>
                            You&apos;ll keep access until {accessUntilText}. Are you sure?
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                            <button onClick={handleCancelSubscription} disabled={cancelling} style={linkBtnStyle('#d32f2f', cancelling)}>
                                {cancelling ? 'Cancelling…' : 'Yes, cancel subscription'}
                            </button>
                            <button onClick={() => setCancelConfirming(false)} style={linkBtnStyle('#888')}>
                                Keep subscription
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setCancelConfirming(true)} style={linkBtnStyle('#d32f2f')}>
                        Cancel Subscription
                    </button>
                )
            )}

            {/* Cancel trial */}
            {isTrial && hasStripeSub && (
                trialCancelled ? (
                    <p style={{ fontSize: '0.9rem', margin: 0, color: '#4caf50' }}>
                        Your trial has been cancelled. You will not be charged.
                    </p>
                ) : (
                    <button onClick={handleCancelTrial} disabled={trialCancelling} style={linkBtnStyle('#d32f2f', trialCancelling)}>
                        {trialCancelling ? 'Cancelling…' : 'Cancel Trial'}
                    </button>
                )
            )}
        </AccountCard>
    )
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function DisplayProfile({ profile, userId }) {
    const p = profile ?? {}
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [name, setName] = useState(p.name ?? '')
    const [phone, setPhone] = useState(p.phone ?? '')
    const [country, setCountry] = useState(p.country ?? '')

    const handleSave = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, name, phone, country }),
            })
            const result = await res.json()
            if (result.success) {
                setSaved(true)
                setEditing(false)
            } else {
                alert(result.message ?? 'Update failed. Please try again.')
            }
        } catch {
            alert('Something went wrong. Please try again.')
        } finally {
            setSaving(false)
        }
    }

    const inputStyle = {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #ddd',
        fontSize: '1rem',
        width: '100%',
        boxSizing: 'border-box',
    }

    return (
        <AccountCard
            title='Profile'
            action={!editing ? (
                <button onClick={() => setEditing(true)} style={linkBtnStyle('#f05621')}>Edit</button>
            ) : null}
        >
            {editing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <label style={{ fontSize: '0.9rem', color: '#666' }}>
                        Full Name
                        <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginTop: '4px', display: 'block' }} />
                    </label>
                    <label style={{ fontSize: '0.9rem', color: '#666' }}>
                        Email (change in Security section)
                        <input value={p.email ?? ''} disabled style={{ ...inputStyle, marginTop: '4px', display: 'block', opacity: 0.5 }} />
                    </label>
                    <label style={{ fontSize: '0.9rem', color: '#666' }}>
                        Phone
                        <input value={phone} onChange={e => setPhone(e.target.value)} style={{ ...inputStyle, marginTop: '4px', display: 'block' }} />
                    </label>
                    <label style={{ fontSize: '0.9rem', color: '#666' }}>
                        Country
                        <input value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, marginTop: '4px', display: 'block' }} />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '6px',
                                background: saving ? '#ccc' : 'linear-gradient(135deg, #fcb14e 0%, #f05621 100%)',
                                color: '#fff',
                                border: 'none',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                            }}
                        >
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button onClick={() => setEditing(false)} style={linkBtnStyle('#888')}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <Row label='Name' value={p.name || 'N/A'} />
                    <Row label='Email' value={p.email || 'N/A'} />
                    <Row label='Phone' value={p.phone || 'N/A'} />
                    <Row label='Country' value={p.country || 'N/A'} />
                </>
            )}
            {saved && (
                <p style={{ fontSize: '0.9rem', margin: 0, color: '#4caf50', marginTop: '8px' }}>Profile updated successfully.</p>
            )}
        </AccountCard>
    )
}

// ─── Security ────────────────────────────────────────────────────────────────

function DisplaySecurity({ profile, userId, emailChanged, emailError }) {
    const p = profile ?? {}
    const [resetSent, setResetSent] = useState(false)
    const [resetSending, setResetSending] = useState(false)
    const [newEmail, setNewEmail] = useState('')
    const [emailSending, setEmailSending] = useState(false)
    const [emailMsg, setEmailMsg] = useState(emailChanged ? 'Email address updated successfully.' : '')
    const [emailMsgType, setEmailMsgType] = useState(emailChanged ? 'success' : '')

    const errorMessages = {
        invalid_link: 'The verification link is invalid.',
        link_expired: 'The verification link has expired. Please request a new one.',
        server_error: 'Something went wrong. Please try again.',
    }
    const initialEmailError = emailError ? (errorMessages[emailError] ?? 'Verification failed.') : ''

    const handlePasswordReset = async () => {
        if (!p.email) return
        setResetSending(true)
        try {
            const res = await fetch('/api/user/resetLink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: p.email }),
            })
            if (res.ok) {
                setResetSent(true)
            } else {
                alert('Could not send reset email. Please contact support.')
            }
        } catch {
            alert('Something went wrong. Please try again.')
        } finally {
            setResetSending(false)
        }
    }

    const handleEmailChange = async () => {
        if (!newEmail.includes('@')) return
        setEmailSending(true)
        setEmailMsg('')
        try {
            const res = await fetch('/api/user/change-email', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, newEmail: newEmail.trim().toLowerCase() }),
            })
            const result = await res.json()
            if (result.success) {
                setEmailMsg('Verification email sent. Check your new inbox and click the link to confirm.')
                setEmailMsgType('success')
                setNewEmail('')
            } else {
                setEmailMsg(result.message ?? 'Could not send verification email.')
                setEmailMsgType('error')
            }
        } catch {
            setEmailMsg('Something went wrong. Please try again.')
            setEmailMsgType('error')
        } finally {
            setEmailSending(false)
        }
    }

    const inputStyle = {
        padding: '8px 12px',
        borderRadius: '6px',
        border: '1px solid #ddd',
        fontSize: '1rem',
        marginRight: '8px',
        minWidth: '220px',
    }

    return (
        <AccountCard title='Security'>
            {/* Password reset */}
            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Password</h4>
                {resetSent ? (
                    <p style={{ fontSize: '0.9rem', margin: 0, color: '#4caf50' }}>
                        Reset email sent to {p.email}. Check your inbox.
                    </p>
                ) : (
                    <button
                        onClick={handlePasswordReset}
                        disabled={resetSending}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            border: '1px solid #ddd',
                            background: '#fff',
                            cursor: resetSending ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                        }}
                    >
                        {resetSending ? 'Sending…' : 'Send Password Reset Email'}
                    </button>
                )}
            </div>

            {/* Email change */}
            <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '4px' }}>Email Address</h4>
                <p style={{ fontSize: '0.9rem', margin: 0, color: '#666', marginBottom: '8px' }}>
                    Current: <strong>{p.email}</strong>
                </p>
                {initialEmailError && (
                    <p style={{ fontSize: '0.9rem', margin: 0, color: '#d32f2f', marginBottom: '8px' }}>{initialEmailError}</p>
                )}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                        type='email'
                        placeholder='New email address'
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        style={inputStyle}
                    />
                    <button
                        onClick={handleEmailChange}
                        disabled={emailSending || !newEmail.includes('@')}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '6px',
                            background: emailSending || !newEmail.includes('@')
                                ? '#ccc'
                                : 'linear-gradient(135deg, #fcb14e 0%, #f05621 100%)',
                            color: '#fff',
                            border: 'none',
                            cursor: emailSending || !newEmail.includes('@') ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                        }}
                    >
                        {emailSending ? 'Sending…' : 'Send Verification'}
                    </button>
                </div>
                {emailMsg && (
                    <p style={{ fontSize: '0.9rem', margin: 0, color: emailMsgType === 'success' ? '#4caf50' : '#d32f2f', marginTop: '8px' }}>
                        {emailMsg}
                    </p>
                )}
            </div>
        </AccountCard>
    )
}

// ─── Shared ──────────────────────────────────────────────────────────────────

function linkBtnStyle(color, disabled) {
    return {
        background: 'none',
        border: 'none',
        color: disabled ? '#aaa' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        textDecoration: 'underline',
        padding: 0,
        opacity: disabled ? 0.6 : 1,
    }
}
