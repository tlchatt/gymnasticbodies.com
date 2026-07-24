import AccountDetailsComp from '@/components/AccountDetailsComp';
import { getAccountInformation } from '@/lib/commonFunctions';
import {
    getProfileSection,
    getSubscriptionSection,
    getPaymentSection,
    getActivitySection,
    getWorkoutHistorySection,
    getLevelsSection,
    getThriveSection,
    getPreferencesSection,
    getSupportSection,
} from '@/lib/accountData';

// Resolve a Promise.allSettled result to its value, or null on rejection.
const settled = (r) => (r.status === 'fulfilled' ? r.value : null);

export default async function page({ searchParams }) {
    const params = await searchParams
    const token = params.token
    const userId = params.userId
    const emailChanged = params.emailChanged === '1'
    const emailError = params.emailError ?? null

    // Every source is fetched independently and resilient (each fetcher returns null
    // on failure). allSettled guarantees one broken source can never blank the page.
    const [
        account,
        profile,
        subscription,
        payment,
        activity,
        workoutHistory,
        levels,
        thrive,
        preferences,
        support,
    ] = (await Promise.allSettled([
        getAccountInformation({ userId, token, type: 'subscription' }),
        getProfileSection(userId),
        getSubscriptionSection(userId),
        getPaymentSection(userId),
        getActivitySection(userId),
        getWorkoutHistorySection(userId),
        getLevelsSection(userId),
        getThriveSection(userId),
        getPreferencesSection(userId),
        getSupportSection(userId),
    ])).map(settled)

    // Existing Stripe/Auth.net subscribers' card-on-file lives in the
    // getAccountInformation enrichment (cardType / cardNumber), not the new
    // save-flow fields getPaymentSection reads. When the new-flow fields are
    // absent, surface that card so the section never claims "No payment method
    // saved" while a card is actively billing. Resilient: account may be null.
    const paymentWithAccountCard = (() => {
        if (payment?.hasCard) return payment
        const clean = (v) => (v && v !== 'N/A' ? v : null)
        const brand = clean(account?.cardType)
        const number = clean(account?.cardNumber)
        if (!brand && !number) return payment
        const digits = typeof number === 'string' ? number.replace(/\D/g, '') : ''
        const last4 = digits.length >= 4 ? digits.slice(-4) : null
        if (!brand && !last4) return payment
        return { ...(payment ?? {}), hasCard: true, cardBrand: brand, cardLast4: last4 }
    })()

    // Refine the DB-derived subscription badge with the live Stripe-enriched flags
    // from getAccountInformation, so the badge can never contradict the Stripe-driven
    // Manage Subscription actions rendered on the same page. Only engages when the
    // user has a real Stripe sub and the enrichment disagrees with the DB label.
    const subscriptionRefined = (() => {
        if (!subscription) return subscription
        const imp = account?.impInfo
        const hasStripeSub = typeof imp?.subscriptionId === 'string' && imp.subscriptionId.startsWith('sub_')
        if (!hasStripeSub || typeof imp?.isActive !== 'boolean') return subscription
        if (imp.isActive === subscription.isActive) return subscription
        return {
            ...subscription,
            isActive: imp.isActive,
            statusLabel: imp.isActive ? (imp.trial ? 'Trial' : 'Active') : 'Expired',
        }
    })()

    const allEmpty = !account && !profile && !subscription && !payment && !activity && !workoutHistory
        && !levels && !thrive && !preferences && !support

    if (allEmpty) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2>Account information not available.</h2>
                <p>We could not find details for this account.</p>
            </div>
        )
    }

    return (
        <AccountDetailsComp
            data={account}
            profile={profile}
            userId={userId}
            token={token}
            subscription={subscriptionRefined}
            payment={paymentWithAccountCard}
            activity={activity}
            workoutHistory={workoutHistory}
            levels={levels}
            thrive={thrive}
            preferences={preferences}
            support={support}
            emailChanged={emailChanged}
            emailError={emailError}
        />
    )
}
