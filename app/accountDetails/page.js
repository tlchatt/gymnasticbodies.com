import AccountDetailsComp from '@/components/AccountDetailsComp';
import { getAccountInformation } from '@/lib/commonFunctions';
import { fetchUserSupportHistory, fetchUserWorkoutLogs } from '@/lib/userHelpers';

export default async function page({ searchParams }) {
    const params = await searchParams
    const token = params.token
    const userId = params.userId
    const emailChanged = params.emailChanged === '1'
    const emailError = params.emailError ?? null

    const [accountInformation, supportHistory, workoutLogs] = await Promise.all([
        getAccountInformation({ userId, token, type: 'subscription' }),
        fetchUserSupportHistory(userId),
        fetchUserWorkoutLogs(userId),
    ])

    if (!accountInformation) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2>Account information not available.</h2>
                <p>We could not find subscription details for this account.</p>
            </div>
        )
    }

    return (
        <AccountDetailsComp
            data={accountInformation}
            userId={userId}
            token={token}
            supportHistory={supportHistory}
            workoutLogs={workoutLogs}
            emailChanged={emailChanged}
            emailError={emailError}
        />
    )
}
