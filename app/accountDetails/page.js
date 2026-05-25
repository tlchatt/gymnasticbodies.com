
import AccountDetailsComp from '@/components/AccountDetailsComp';
import { getAccountInformation } from '@/lib/commonFunctions';

export default async function page({ searchParams }) {

    const params = await searchParams
    console.log("params:", params)
    
    const token = params.token
    const userId = params.userId//params.userId
    // const username = params.username
    //0afff0c5-5e98-4932-9623-7d7978be6fcb    ---> non auth user with renewaldate in the past. 
    // stNvX7bF0ep2aUJTcGRdzJsXrlGuj7g2 ----->tlchatt auth user

    //fb8274cc-c462-4d2d-9095-5c1c97f63b09   ----> non auth user with inactive order
    let dataJson = {
        userId: userId,//props.userId,
        token: token,
        type: 'subscription',

    }

    let accountInformation = await getAccountInformation(dataJson)
    console.log("accountInformation:", accountInformation)

    if (!accountInformation) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <h2>Account information not available.</h2>
                <p>We could not find subscription details for this account.</p>
            </div>
        )
    }

    return (
        <AccountDetailsComp data={accountInformation} userId={userId} />
        // <AccountDetailsComp userId={userId} username={username}/>
    );





}

