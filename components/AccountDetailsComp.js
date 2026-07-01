'use client'
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Stack } from '@mui/material';
import { useState } from 'react';

export default function AccountDetailsComp({ data, userId, token, supportHistory, workoutLogs, emailChanged, emailError }) {
    let titleStyle = { color: '#656464', padding: '24px 0 0' }

    return (
        <>
            <Typography variant='h3' gutterBottom style={titleStyle} id='responsive-dialog-title' align='center'>
                ACCOUNT
            </Typography>
            <Stack direction='column' spacing={2} style={{ margin: '20px' }}>
                <DisplaySubscription data={data} userId={userId} token={token} />
                <DisplayOrder data={data} />
                <DisplayProfile data={data} userId={userId} />
                <DisplaySecurity data={data} emailChanged={emailChanged} emailError={emailError} userId={userId} />
                <DisplaySupportHistory supportHistory={supportHistory} />
                <DisplayActivity workoutLogs={workoutLogs} />
            </Stack>
        </>
    )
}

// ─── Subscription ────────────────────────────────────────────────────────────

function DisplaySubscription({ data, userId, token }) {
    let { cardType, cardNumber, impInfo, migrationStatus } = data ?? {}

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

    let presentContent = [
        { 'Status': impInfo?.status },
        impInfo?.trial ? { 'Trial End Date': impInfo?.trialEndDate } : null,
        { 'Plan': impInfo?.subscriptionName },
        { 'Amount': `$${impInfo?.price}` },
        { 'Term': impInfo?.matchedTerm },
        { 'Next Payment': impInfo?.redableNextPaymentDate },
        { 'Payment Method': cardType && cardType !== 'N/A' ? `${cardType} ending in ${cardNumber}` : 'No payment info on file' },
    ]
    let absentContent = [{ 'No Subscription': 'N/A' }]

    const isActive = impInfo?.status === 'Active' && migrationStatus !== 'noncurrent'
    const isTrial = !!impInfo?.trial
    const hasStripeSub = impInfo?.subscriptionId?.startsWith?.('sub_')

    return (
        <GridBox>
            <Stack direction='row' spacing={2} style={{ margin: '20px' }}>
                <Headline data='Manage Subscription' />
                {isActive && !isTrial && (
                    <Stack direction='column' spacing={2} style={{ width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                        {/* placeholder — cancel UI rendered below */}
                    </Stack>
                )}
                {!isActive && (
                    <Stack direction='column' spacing={2} style={{ width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                        <a
                            href={`/renew?email=${encodeURIComponent(impInfo?.email || '')}&token=${encodeURIComponent(token || '')}&userId=${encodeURIComponent(userId || '')}`}
                            style={{
                                display: 'inline-block',
                                padding: '10px 24px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #fcb14e 0%, #f05621 100%)',
                                color: '#fff',
                                fontWeight: '600',
                                fontSize: '0.9rem',
                                textDecoration: 'none',
                            }}
                        >
                            Renew Subscription
                        </a>
                    </Stack>
                )}
            </Stack>

            <Stack direction='row' spacing={2} style={{ margin: '20px' }}>
                <Stack direction='column' spacing={2} style={{ justifyContent: 'space-between', display: 'flex' }}>
                    <Content content={impInfo?.hasSubscription ? presentContent : absentContent} />
                </Stack>
            </Stack>

            {/* Cancel active (non-trial) subscription */}
            {isActive && !isTrial && hasStripeSub && (
                <Stack direction='row' spacing={2} style={{ margin: '20px' }}>
                    {cancelledUntil ? (
                        <Typography variant='body1' style={{ color: '#4caf50' }}>
                            Subscription cancelled. Access continues until {cancelledUntil}.
                        </Typography>
                    ) : cancelConfirming ? (
                        <Stack direction='column' spacing={1}>
                            <Typography variant='body2' style={{ color: '#555' }}>
                                You'll keep access until {impInfo?.redableNextPaymentDate}. Are you sure?
                            </Typography>
                            <Stack direction='row' spacing={2}>
                                <button
                                    onClick={handleCancelSubscription}
                                    disabled={cancelling}
                                    style={linkBtnStyle('#d32f2f', cancelling)}
                                >
                                    {cancelling ? 'Cancelling…' : 'Yes, cancel subscription'}
                                </button>
                                <button
                                    onClick={() => setCancelConfirming(false)}
                                    style={linkBtnStyle('#888')}
                                >
                                    Keep subscription
                                </button>
                            </Stack>
                        </Stack>
                    ) : (
                        <button onClick={() => setCancelConfirming(true)} style={linkBtnStyle('#d32f2f')}>
                            Cancel Subscription
                        </button>
                    )}
                </Stack>
            )}

            {/* Cancel trial */}
            {isTrial && hasStripeSub && (
                <Stack direction='row' spacing={2} style={{ margin: '20px' }}>
                    {trialCancelled ? (
                        <Typography variant='body1' style={{ color: '#4caf50' }}>
                            Your trial has been cancelled. You will not be charged.
                        </Typography>
                    ) : (
                        <button
                            onClick={handleCancelTrial}
                            disabled={trialCancelling}
                            style={linkBtnStyle('#d32f2f', trialCancelling)}
                        >
                            {trialCancelling ? 'Cancelling…' : 'Cancel Trial'}
                        </button>
                    )}
                </Stack>
            )}
        </GridBox>
    )
}

// ─── Order ───────────────────────────────────────────────────────────────────

function DisplayOrder({ data }) {
    let { cardType, cardNumber, impInfo, lastTransactionInvoiceNumber } = data ?? {}

    let presentContent = [
        { 'Status': impInfo?.status },
        { 'Last Order Date': impInfo?.redableRecentTransactionDate },
        { 'Invoice': lastTransactionInvoiceNumber },
        { 'Amount': `${impInfo?.price} ${impInfo?.matchedTerm}` },
        { 'Next Payment Date': impInfo?.redableNextPaymentDate },
        { 'Payment Method': cardType && cardType !== 'N/A' ? `${cardType} ending in ${cardNumber}` : 'No Payment Info Added' },
    ]
    let otherSourcesContent = [
        { 'Status': impInfo?.status },
        { 'Amount': `${impInfo?.price} ${impInfo?.matchedTerm}` },
        { 'Plan': impInfo?.subscriptionName },
        { 'Next Payment Date': impInfo?.redableNextPaymentDate },
    ]

    return (
        <GridBox>
            <Stack direction='row' spacing={2} style={{ margin: '20px' }}>
                <Headline data='Order Information' />
            </Stack>
            <Stack direction='row' spacing={2} style={{ margin: '20px', display: 'grid' }}>
                {lastTransactionInvoiceNumber && lastTransactionInvoiceNumber !== 'N/A'
                    ? <Content content={presentContent} />
                    : impInfo?.OtherSourcesNextImport
                        ? <Content content={otherSourcesContent} />
                        : <Content content={[{ 'No Order Present': 'N/A' }]} />
                }
            </Stack>
        </GridBox>
    )
}

// ─── Profile ─────────────────────────────────────────────────────────────────

function DisplayProfile({ data, userId }) {
    let { impInfo } = data ?? {}
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [name, setName] = useState(impInfo?.firstName ? `${impInfo.firstName} ${impInfo.lastName}`.trim() : '')
    const [phone, setPhone] = useState(impInfo?.phoneNumber !== 'N/A' ? impInfo?.phoneNumber ?? '' : '')
    const [country, setCountry] = useState(impInfo?.country !== 'N/A' ? impInfo?.country ?? '' : '')

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
        <GridBox>
            <Stack direction='row' spacing={2} style={{ margin: '20px', alignItems: 'center' }}>
                <Headline data='Profile' />
                {!editing && (
                    <button onClick={() => setEditing(true)} style={linkBtnStyle('#f05621')}>
                        Edit
                    </button>
                )}
            </Stack>
            <Stack direction='column' spacing={2} style={{ margin: '20px' }}>
                {editing ? (
                    <Stack direction='column' spacing={2}>
                        <label style={{ fontSize: '0.9rem', color: '#666' }}>
                            Full Name
                            <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, marginTop: '4px', display: 'block' }} />
                        </label>
                        <label style={{ fontSize: '0.9rem', color: '#666' }}>
                            Email (change in Security section)
                            <input value={impInfo?.email ?? ''} disabled style={{ ...inputStyle, marginTop: '4px', display: 'block', opacity: 0.5 }} />
                        </label>
                        <label style={{ fontSize: '0.9rem', color: '#666' }}>
                            Phone
                            <input value={phone} onChange={e => setPhone(e.target.value)} style={{ ...inputStyle, marginTop: '4px', display: 'block' }} />
                        </label>
                        <label style={{ fontSize: '0.9rem', color: '#666' }}>
                            Country
                            <input value={country} onChange={e => setCountry(e.target.value)} style={{ ...inputStyle, marginTop: '4px', display: 'block' }} />
                        </label>
                        <Stack direction='row' spacing={2}>
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
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                }}
                            >
                                {saving ? 'Saving…' : 'Save Changes'}
                            </button>
                            <button onClick={() => setEditing(false)} style={linkBtnStyle('#888')}>
                                Cancel
                            </button>
                        </Stack>
                    </Stack>
                ) : (
                    <Content content={[
                        { 'Name': `${impInfo?.firstName ?? ''} ${impInfo?.lastName ?? ''}`.trim() || 'N/A' },
                        { 'Email': impInfo?.email ?? 'N/A' },
                        { 'Phone': impInfo?.phoneNumber ?? 'N/A' },
                        { 'Country': impInfo?.country ?? 'N/A' },
                    ]} />
                )}
                {saved && (
                    <Typography variant='body2' style={{ color: '#4caf50' }}>Profile updated successfully.</Typography>
                )}
            </Stack>
        </GridBox>
    )
}

// ─── Security ────────────────────────────────────────────────────────────────

function DisplaySecurity({ data, userId, emailChanged, emailError }) {
    let { impInfo } = data ?? {}
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
        if (!impInfo?.email) return
        setResetSending(true)
        try {
            const res = await fetch('/api/user/resetLink', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: impInfo.email }),
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
        <GridBox>
            <Stack direction='column' spacing={0} style={{ margin: '20px' }}>
                <Headline data='Security' />
            </Stack>

            {/* Password reset */}
            <Stack direction='column' spacing={1} style={{ margin: '20px' }}>
                <Typography variant='h6' style={{ fontWeight: '600', marginBottom: '4px' }}>Password</Typography>
                {resetSent ? (
                    <Typography variant='body2' style={{ color: '#4caf50' }}>
                        Reset email sent to {impInfo?.email}. Check your inbox.
                    </Typography>
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
                            alignSelf: 'flex-start',
                        }}
                    >
                        {resetSending ? 'Sending…' : 'Send Password Reset Email'}
                    </button>
                )}
            </Stack>

            {/* Email change */}
            <Stack direction='column' spacing={1} style={{ margin: '20px' }}>
                <Typography variant='h6' style={{ fontWeight: '600', marginBottom: '4px' }}>Email Address</Typography>
                <Typography variant='body2' style={{ color: '#666', marginBottom: '8px' }}>
                    Current: <strong>{impInfo?.email}</strong>
                </Typography>
                {initialEmailError && (
                    <Typography variant='body2' style={{ color: '#d32f2f', marginBottom: '8px' }}>{initialEmailError}</Typography>
                )}
                <Stack direction='row' spacing={1} style={{ flexWrap: 'wrap', gap: '8px' }}>
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
                            fontWeight: '600',
                        }}
                    >
                        {emailSending ? 'Sending…' : 'Send Verification'}
                    </button>
                </Stack>
                {emailMsg && (
                    <Typography variant='body2' style={{ color: emailMsgType === 'success' ? '#4caf50' : '#d32f2f', marginTop: '8px' }}>
                        {emailMsg}
                    </Typography>
                )}
            </Stack>
        </GridBox>
    )
}

// ─── Support History ──────────────────────────────────────────────────────────

function DisplaySupportHistory({ supportHistory }) {
    const [expanded, setExpanded] = useState(null)
    const emails = supportHistory ?? []

    const statusColors = { open: '#f59e0b', replied: '#3b82f6', closed: '#9ca3af' }

    return (
        <GridBox>
            <Stack direction='column' spacing={0} style={{ margin: '20px' }}>
                <Headline data='Support History' />
            </Stack>
            <Stack direction='column' spacing={0} style={{ margin: '20px' }}>
                {emails.length === 0 ? (
                    <Typography variant='body2' style={{ color: '#888' }}>No support history found.</Typography>
                ) : (
                    emails.map((email) => {
                        const isOpen = expanded === email.id
                        const date = email.receivedAt
                            ? new Date(email.receivedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : ''
                        return (
                            <div
                                key={email.id}
                                style={{
                                    borderBottom: '1px solid #eee',
                                    padding: '12px 0',
                                    cursor: 'pointer',
                                }}
                                onClick={() => setExpanded(isOpen ? null : email.id)}
                            >
                                <Stack direction='row' spacing={2} style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant='body1' style={{ fontWeight: isOpen ? '600' : '400', flex: 1 }}>
                                        {email.subject}
                                    </Typography>
                                    <Stack direction='row' spacing={1} style={{ alignItems: 'center', flexShrink: 0 }}>
                                        <span style={{
                                            fontSize: '0.75rem',
                                            padding: '2px 8px',
                                            borderRadius: '100px',
                                            background: statusColors[email.status] ?? '#ddd',
                                            color: '#fff',
                                            textTransform: 'capitalize',
                                        }}>
                                            {email.status}
                                        </span>
                                        <Typography variant='caption' style={{ color: '#999' }}>{date}</Typography>
                                        <Typography variant='caption' style={{ color: '#ccc' }}>{isOpen ? '▲' : '▼'}</Typography>
                                    </Stack>
                                </Stack>
                                {email.caseTitle && (
                                    <Typography variant='caption' style={{ color: '#888' }}>Case: {email.caseTitle}</Typography>
                                )}
                                {isOpen && (
                                    <div style={{ marginTop: '12px', padding: '12px', background: '#f9f9f9', borderRadius: '6px', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {email.body}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </Stack>
        </GridBox>
    )
}

// ─── Activity ────────────────────────────────────────────────────────────────

function DisplayActivity({ workoutLogs }) {
    const logs = workoutLogs ?? []
    const total = logs.length
    const latest = logs[0]
    const latestDate = latest?.userScheduleDate ?? (latest?.createdAt
        ? new Date(latest.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : null)

    return (
        <GridBox>
            <Stack direction='column' spacing={0} style={{ margin: '20px' }}>
                <Headline data='Workout Activity' />
            </Stack>
            <Stack direction='column' spacing={1} style={{ margin: '20px' }}>
                {total === 0 ? (
                    <Typography variant='body2' style={{ color: '#888' }}>No workout logs found.</Typography>
                ) : (
                    <>
                        <Content content={[
                            { 'Total Workouts Logged': String(total) },
                            { 'Most Recent': latestDate ?? 'N/A' },
                        ]} />
                        <a
                            href='https://my.gymnasticbodies.com'
                            style={{ color: '#f05621', textDecoration: 'none', fontSize: '0.9rem', marginTop: '8px', display: 'inline-block' }}
                        >
                            View your workouts →
                        </a>
                    </>
                )}
            </Stack>
        </GridBox>
    )
}

// ─── Shared Primitives ───────────────────────────────────────────────────────

function Content({ content }) {
    return (
        <Stack direction='column' spacing={2}>
            {content.map((item, index) => {
                if (!item) return null
                const [data] = Object.entries(item)
                return (
                    <div key={index}>
                        {content.length > 1 ? (
                            <Stack direction='row' spacing={2} style={{ display: 'grid', gridAutoFlow: 'column', justifyContent: 'start' }}>
                                <Titles title={data[0]} />
                                <Values value={data[1]} />
                            </Stack>
                        ) : (
                            <Stack direction='row' spacing={2} style={{ display: 'grid', gridAutoFlow: 'column', justifyContent: 'start' }}>
                                <Titles title={data[0]} />
                            </Stack>
                        )}
                    </div>
                )
            })}
        </Stack>
    )

    function Titles({ title }) {
        return (
            <Typography variant='h5' component='h2' sx={{ fontWeight: 'bold', margin: '20px', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                {title}
            </Typography>
        )
    }
    function Values({ value }) {
        return (
            <Typography variant='h5' component='h2' sx={{ margin: '20px', fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                {value}
            </Typography>
        )
    }
}

function Headline({ data }) {
    return (
        <Stack direction='column' spacing={2} style={{ width: '100%' }}>
            <Typography id='modal-modal-title' variant='h4' component='h2'>{data}</Typography>
        </Stack>
    )
}

function GridBox({ children }) {
    return (
        <Grid size={6}>
            <Box style={{ width: '100%', boxShadow: '0 4px 5px 0 rgba(0,0,0,0.14),0 1px 10px 0 rgba(0,0,0,0.12),0 2px 4px -1px rgba(0,0,0,0.2)', padding: '20px' }}>
                {children}
            </Box>
        </Grid>
    )
}

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
