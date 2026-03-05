import { APIContracts as ApiContracts, APIControllers as ApiControllers, Constants as SDKConstants } from 'authorizenet';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { writeQueue } from '@/lib/writeFile';
import { fetchCustomerFromAuthorize, getUserWithId, queryUserSetting } from '@/lib/userSettings';
import { allAuthorizeData } from '../../../../data/allAuthorizeData.json'

export async function POST(request) {
    let testUrl = process.env.NEXT_PUBLIC_API_URL
    console.log("testUrl:", testUrl)
    let json = await request.json()
    console.log("json is:", json)
    // let userInfo = await getUserWithId(json.userId)

    let usersettingInfo = await queryUserSetting(json.userId, json.type)

    console.log("dbUser:", usersettingInfo)
    let customerId = usersettingInfo?.authorizeCustomerId
    let userSettingEmail = JSON.parse(usersettingInfo?.data).email//has email
    console.log("customerId:", customerId)
    console.log("userSettingEmail:", userSettingEmail)

    if (!customerId) {
        let customerData = allAuthorizeData.find(data => data.result.profile.email === userSettingData.email);
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


