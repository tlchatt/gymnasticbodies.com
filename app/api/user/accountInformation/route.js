import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserWithId, queryUserSetting } from '@/lib/userSettings';
import { getAllDataFromFile } from '@/lib/commonServerFunction';

export async function POST(request) {
    let testUrl = process.env.NEXT_PUBLIC_API_URL
    let json = await request.json()
    console.log("json in accountInformation post is:", json)

    let usersettingInfo = await queryUserSetting(json.userId, json.type)
    console.log("usersettingInfo:", usersettingInfo)

    let userEmail = JSON.parse(usersettingInfo?.data).email//has email
    let customerId = usersettingInfo?.authorizeCustomerId
    
    if(!userEmail){//if user doesn't have email in userSetting
        let userInfo = await getUserWithId(json.userId)//to get Email
        console.log("userInfo:", userInfo)
        userEmail = userInfo.email
    }
    console.log("userEmail:", userEmail)

    if (!customerId) {
        let customerData = await getAllDataFromFile(userEmail)
        // let customerData = allAuthorizeData.find(data => data.result.profile.email === userEmail);
        customerId = customerData?.result?.profile?.customerProfileId;
    }

    console.log("customerId:", customerId)

    let authorizeData = await fetchCustomerFromAuthorize(customerId)
    console.log("authorizeData:", authorizeData)

    return NextResponse.json(authorizeData);
    
    async function fetchCustomerFromAuthorize(id) {
        try {
            let response = await fetch(`${testUrl}/api/user/authorizePlatform`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: id, singleUser: true }),
            });
            const data = await response.json();
            console.log("response:", data)
            // Process the response
            return data
        } catch (error) {
            return error
        }

    }


}


