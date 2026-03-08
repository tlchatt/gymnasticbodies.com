
import AccountDetailsComp from '@/components/AccountDetailsComp';

export default async function page({ searchParams }) {

    const params = await searchParams
    console.log("params:", params)
    
    const token = params.token
    const userId = params.userId
    // const username = params.username


    return (
        <AccountDetailsComp userId={userId}/>
        // <AccountDetailsComp userId={userId} username={username}/>
    );



    

}