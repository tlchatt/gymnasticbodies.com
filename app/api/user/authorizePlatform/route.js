import { APIContracts as ApiContracts, APIControllers as ApiControllers, Constants as SDKConstants } from 'authorizenet';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { writeQueue } from '@/lib/writeFile';
import { getCustomerFromAuthorize, getCustomerSubscriptionFromAuthorize, getTransactionHistory } from '@/lib/commonServerFunction';
import { getFlagAndSubscriptionInfo } from '@/lib/commonFunctions';

export async function POST(request) {
    let json = await request.json()
    let result = {}, customerSubscription = {}, allIds, transactionHistory, impInfo
    if (json.singleUser) {
        result = await getCustomerFromAuthorize(json.id);

        if (result.data.subscriptionIds) {
            customerSubscription = await getCustomerSubscriptionFromAuthorize(result.data.subscriptionIds[0]);
            // console.log("customerSubscription is:", customerSubscription)
        }
        if (result?.data?.profile?.customerProfileId) {
            transactionHistory = await getTransactionHistory(result)
            // console.log("transactionHistory is:", transactionHistory)
        }
        let finalObj = {
            result: result.data,
            transactionHistory: transactionHistory,
            customerSubscription: customerSubscription
        }
        impInfo = await getFlagAndSubscriptionInfo(finalObj)
    } else {
        allIds = await getAllCustomerIdsFromAuthorize();

        let finalArray = [];
        for (const id of allIds) {
            const result = await getCustomerFromAuthorize(id);

            let transactionHistory, customerSubscription;
            if (result?.data?.profile?.customerProfileId) {
                transactionHistory = await getTransactionHistory(result);
            }

            if (result?.data?.subscriptionIds) {
                customerSubscription = await getCustomerSubscriptionFromAuthorize(result.data.subscriptionIds[0]);
                // await storeInFile(customerSubscription)
            }

            finalArray.push({
                result: result?.data,
                transactionHistory,
                customerSubscription,
            });
        }
        await storeInFile(finalArray)
        // await getAllCustomerSubscriptionFromAuthorize(result.data.subscriptionIds[0]);
    }
    if (result) {
        let billTo = result?.data?.profile?.paymentProfiles?.[0]?.billTo
        let paymentProfile = result?.data?.profile?.paymentProfiles?.[0]?.payment
        let shippingProfile = result?.data?.profile?.shipToList
        let merchantCustomerId = result?.data?.profile?.merchantCustomerId
        let customerPaymentProfileId = result?.data?.profile?.paymentProfiles?.[0]?.customerPaymentProfileId
        let customerProfileId = result?.data?.profile?.customerProfileId
        let hasSubscription = result?.data?.subscriptionIds ? true : false
        let transactionProfile = transactionHistory?.data?.transactions
        let subscriptionProfile = customerSubscription?.data?.subscription//would be {} if not subscription info present which would be case for old customers from woo commerce.
        let subscriptionStartDate = new Date(subscriptionProfile?.paymentSchedule?.startDate) ?? "N/A"

        let intervalLength = subscriptionProfile?.paymentSchedule?.interval?.length ?? "N/A";
        let intervalUnit = subscriptionProfile?.paymentSchedule?.interval?.unit ?? "N/A";
        let term = "N/A"
        if (subscriptionProfile?.amount == "0.02") {//225, 75 per month billed quarterly
            term = "quarterly"
        }
        if (subscriptionProfile?.amount == "0.01") {//720, 60 per month billed yearly
            term = "yearly"
        }
        let endDate = "N/A"

        if (intervalUnit == "days") {//test was set to be days
            // endDate = new Date(subscriptionStartDate.getTime() + intervalLength * 24 * 60 * 60 * 1000);
            endDate = new Date(subscriptionStartDate.getTime() + intervalLength * 24 * 60 * 60 * 1000);
        } else {//we set it to always be month
            endDate = new Date(subscriptionStartDate.getFullYear(), subscriptionStartDate.getMonth() + intervalLength, subscriptionStartDate.getDate());
        }
        return NextResponse.json({
            firstName: billTo?.firstName ?? "N/A",
            lastName: billTo?.lastName ?? "N/A",
            email: result?.data?.profile?.email ?? "N/A",
            phoneNumber: billTo?.phoneNumber ?? "N/A",

            country: billTo?.country ?? "N/A",
            cardType: paymentProfile?.creditCard?.cardType ?? "N/A",
            cardNumber: paymentProfile?.creditCard?.cardNumber ?? "N/A",
            customerAddressId: shippingProfile?.[0]?.customerAddressId ?? false,
            merchantCustomerId: merchantCustomerId ?? false,
            customerPaymentProfileId: customerPaymentProfileId ?? false,
            customerProfileId: customerProfileId ?? false,
            recentTransaction: transactionProfile ? transactionProfile[0] : "N/A",
            transactionHistory: transactionProfile ?? "N/A",
            lastTransactionStatus: transactionProfile ? transactionProfile[0]?.transactionStatus : "N/A",
            lastTransactionInvoiceNumber: transactionProfile ? transactionProfile[0]?.invoiceNumber : "N/A",
            lastTransactionAmount: transactionProfile ? transactionProfile[0]?.settleAmount : "N/A",
            lastTransactionDate: transactionProfile ? transactionProfile[0]?.submitTimeLocal : "N/A",
            nextTransactionDate: "need to figure out since amount vary and no interval provided",
            subscriptionName: subscriptionProfile?.name ?? "N/A",
            subscriptionAmount: subscriptionProfile?.amount ?? "N/A",
            subscriptionStatus: subscriptionProfile?.status ?? "N/A",
            subscriptionStartDate: subscriptionStartDate ?? "N/A",
            subscriptionEndDate: endDate,
            subscriptionEndDateDisplay: endDate != "Invalid Date" ? endDate?.toISOString().split('T')[0] : "N/A",
            term: term,
            hasSubscription: hasSubscription,
            impInfo: impInfo
        });
    }
    // else {
    //     return NextResponse.json({
    //         data: {
    //             result,
    //             customerSubscription,
    //             transactionHistory
    //         }
    //     }, { status: 500 });
    // }
    // res.json(result);

    async function getAllCustomerIdsFromAuthorize() {
        var getRequest = new ApiContracts.GetCustomerProfileIdsRequest();
        let merchantAuth = await authorizePaymentAuthentication()
        getRequest.setMerchantAuthentication(merchantAuth);

        var ctrl = new ApiControllers.GetCustomerProfileIdsController(getRequest.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);
        try {
            const apiResponse = await new Promise((resolve, reject) => {
                ctrl.execute(() => {
                    resolve(ctrl.getResponse());
                }, (error) => {
                    console.log("error for transaction:", error)
                    reject(error);
                });
            });
            if (apiResponse.messages.resultCode === "Error") {
                const message = apiResponse.messages.message[0];
                // console.log("message in createAuthorizeTransaction:", message);

                return { status: false, data: apiResponse }
            } else {


                return { status: true, data: apiResponse }

            }

        } catch (error) {
            return { status: false, data: error }
        }

        async function authorizePaymentAuthentication() {
            // Set up the merchant authentication
            const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
            const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

            const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
            merchantAuthenticationType.setName(apiLoginId);
            merchantAuthenticationType.setTransactionKey(transactionKey);

            return merchantAuthenticationType
        }
    }
    async function getAllCustomerSubscriptionFromAuthorize(subscriptionId) {
        let merchantAuth = await authorizePaymentAuthentication()
        var getRequest = new ApiContracts.ARBGetSubscriptionRequest();
        getRequest.setMerchantAuthentication(merchantAuth);
        getRequest.setSubscriptionId(subscriptionId);

        var ctrl = new ApiControllers.ARBGetSubscriptionController(getRequest.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);

        try {
            const apiResponse = await new Promise((resolve, reject) => {
                ctrl.execute(() => {
                    resolve(ctrl.getResponse());
                }, (error) => {
                    console.log("error for transaction:", error)
                    reject(error);
                });
            });
            if (apiResponse.messages.resultCode === "Error") {
                const message = apiResponse.messages.message[0];
                // console.log("message in createAuthorizeTransaction:", message);
                return { status: false, data: apiResponse }
            } else {

                return { status: true, data: apiResponse }
            }

        } catch (error) {
            return { status: false, data: error }
        }
    }
    async function storeInFile(customerSubscription) {
        // Define the file path relative to the project root
        try {
            const filePath = path.join(process.cwd(), 'data', 'authorizeData7.json');
            // Read the existing data from the file
            let fileData;
            // This will wait for any previous writes to finish before starting
            await writeQueue.add(async () => {
                try {
                    fileData = await fs.readFile(filePath, 'utf8');
                } catch (error) {
                    if (error.code === 'ENOENT') {
                        fileData = '[]'; // start with empty array if file doesn't exist
                    } else {
                        throw error;
                    }
                }

                let jsonData;
                try {
                    jsonData = JSON.parse(fileData);
                } catch (error) {
                    console.error('Invalid JSON, resetting file:', error);
                    jsonData = [];
                }

                if (!Array.isArray(jsonData)) {
                    jsonData = []; // fallback to array if data isn't an array
                }

                jsonData.push(customerSubscription);

                await fs.writeFile(filePath, JSON.stringify(customerSubscription, null, 2));
            })

            return new Response(JSON.stringify({ message: 'Data successfully written' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            console.error('Error writing to file:', error);
            return new Response(JSON.stringify({ message: 'Error writing data' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
}


