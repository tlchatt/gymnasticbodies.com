import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getUserWithId, queryUserSetting } from '@/lib/userSettings';
import { getAllCustomerDataFromAuthorize, getAllDataFromFile, getCustomerFromAuthorize, getCustomerSubscriptionFromAuthorize, getTransactionHistory } from '@/lib/commonServerFunction';
import { getFlagAndSubscriptionInfo } from '@/lib/commonFunctions';
import { ConnectingAirportsOutlined } from '@mui/icons-material';

export async function POST(request) {
    let testUrl = process.env.NEXT_PUBLIC_API_URL
    let json = await request.json()

    let usersettingInfo = await queryUserSetting(json.userId, json.type)//get User Setting from neon db

    let postAWS = usersettingInfo?.postAWS

    let userEmail = usersettingInfo ? JSON.parse(usersettingInfo?.data).email : null//has email
    let customerId = usersettingInfo?.authorizeCustomerId

    if (!userEmail) {//if user doesn't have email in userSetting
        let userInfo = await getUserWithId(json.userId)//to get userInfo from neon db
        userEmail = userInfo ? userInfo?.email : null
        if (!userInfo) {
            userEmail = json?.username
        }
    }

    if (!customerId) {
        userEmail = userEmail?.toLowerCase()
        let customerData = await getAllDataFromFile(userEmail)//getting authorizeCustomerData from file
        customerId = customerData?.result?.profile?.customerProfileId;
    }

    let transactionHistory, impInfo

    // let authorizeData = await fetchCustomerFromAuthorize(customerId)//getting customerInfo from Authorize 

    /*let authorizeCustomer = await getCustomerFromAuthorize(customerId);
    if (authorizeCustomer?.data?.subscriptionIds) {
        customerSubscription = await getCustomerSubscriptionFromAuthorize(authorizeCustomer?.data?.subscriptionIds[0]);
        // console.log("customerSubscription is:", customerSubscription)
    }
    if (authorizeCustomer?.data?.profile?.customerProfileId) {
        transactionHistory = await getTransactionHistory(authorizeCustomer)
        // console.log("transactionHistory is:", transactionHistory)
    }
    let authorizeData = {
        result: authorizeCustomer.data,
        transactionHistory: transactionHistory,
        customerSubscription: customerSubscription
    }
    console.log("authorizeCustomer.data.messages.message is:", authorizeCustomer.data.messages.message)
    console.log("authorizeCustomer", authorizeCustomer)
    console.log("result?.data?.profile?.paymentProfiles?.[0]?.billTo:",authorizeCustomer?.data?.profile?.paymentProfiles?.[0]?.billTo)
    console.log("authorizeData is:", authorizeData)*/

    let authorizeData = await getAllCustomerDataFromAuthorize(customerId)
    impInfo = await getFlagAndSubscriptionInfo(authorizeData)
    impInfo.postAWS = postAWS

    if (authorizeData?.result) {
        let paymentProfile = authorizeData?.result?.profile?.paymentProfiles?.[0]?.payment
        let transactionProfile = authorizeData?.transactionHistory?.data?.transactions
        return NextResponse.json({
            cardType: paymentProfile?.creditCard?.cardType ?? "N/A",
            cardNumber: paymentProfile?.creditCard?.cardNumber ?? "N/A",
            recentTransaction: transactionProfile ? transactionProfile[0] : "N/A",
            transactionHistory: transactionProfile ?? "N/A",
            lastTransactionStatus: transactionProfile ? transactionProfile[0]?.transactionStatus : "N/A",
            lastTransactionInvoiceNumber: transactionProfile ? transactionProfile[0]?.invoiceNumber : "N/A",
            impInfo: impInfo

        });
    }

    return NextResponse.json(authorizeData);

    async function fetchCustomerFromAuthorize(id) {
        try {
            let response = await fetch(`${testUrl}/api/user/authorizePlatform`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: id, singleUser: true }),
            })
                .then(response => response.json())
                .then(data => {
                    // Process the response
                    return data;
                })
                .catch(error => {
                    console.error("Error:", error);
                    return error;
                });

            return response
            // Process the response

        } catch (error) {
            return error
        }

    }


}


