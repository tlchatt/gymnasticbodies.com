import { APIContracts as ApiContracts, APIControllers as ApiControllers, Constants as SDKConstants } from 'authorizenet';
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { writeQueue } from '@/lib/writeFile';

export async function POST(request) {
    let json = await request.json()
    console.log("json is:", json)
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
        console.log("result is:", result.data.messages.message)
        console.log("customerSubscription is:", customerSubscription)
        console.log("transactionHistory is:", transactionHistory)
        impInfo = await getFlagAndSubscriptionInfo(finalObj)
        console.log("impInfo:", impInfo)
    } else {
        allIds = await getAllCustomerIdsFromAuthorize();
        console.log("allIds:", allIds)

        let finalArray = [];
        for (const id of allIds) {
            const result = await getCustomerFromAuthorize(id);
            console.log("result:", result)

            let transactionHistory, customerSubscription;
            console.log("result?.data?.profile?.customerProfileId:", result?.data?.profile?.customerProfileId)
            if (result?.data?.profile?.customerProfileId) {
                transactionHistory = await getTransactionHistory(result);
                console.log("transactionHistory:", transactionHistory)
            }

            if (result?.data?.subscriptionIds) {
                customerSubscription = await getCustomerSubscriptionFromAuthorize(result.data.subscriptionIds[0]);
                console.log("customerSubscription:", customerSubscription)
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
    console.log("result is:", result)
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
        console.log("subscriptionProfile:", subscriptionProfile)
        console.log("merchantCustomerId:", merchantCustomerId)
        let subscriptionStartDate = new Date(subscriptionProfile?.paymentSchedule?.startDate) ?? "N/A"

        let intervalLength = subscriptionProfile?.paymentSchedule?.interval?.length ?? "N/A";
        let intervalUnit = subscriptionProfile?.paymentSchedule?.interval?.unit ?? "N/A";
        let term = "N/A"
        console.log("data is::", subscriptionProfile?.amount)
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
        console.log("date of :", endDate)
        console.log("type of :", typeof endDate)
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
    async function authorizePaymentAuthentication() {
        // Set up the merchant authentication
        const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
        const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

        const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
        merchantAuthenticationType.setName(apiLoginId);
        merchantAuthenticationType.setTransactionKey(transactionKey);

        return merchantAuthenticationType
    }
    async function getCustomerFromAuthorize(customerProfileId) {
        console.log("inside getCustomerFromAuthorize")
        var getRequest = new ApiContracts.GetCustomerProfileRequest();

        getRequest.setCustomerProfileId(customerProfileId);
        let merchantAuth = await authorizePaymentAuthentication()
        getRequest.setMerchantAuthentication(merchantAuth);

        var ctrl = new ApiControllers.GetCustomerProfileController(getRequest.getJSON());
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
                // console.log("apiResponse in getCustomerFromAuthorize:", apiResponse)
                let sampleResponse = {
                    profile: {
                        paymentProfiles: [[Object]],
                        shipToList: [[Object]],
                        profileType: 'regular',
                        customerProfileId: '719388555',
                        merchantCustomerId: '33764',
                        email: 'mecheye357@gmail.com'
                    },
                    messages: { resultCode: 'Ok', message: [[Object]] }
                }
                return { status: true, data: apiResponse }

            }

        } catch (error) {
            return { status: false, data: error }
        }
    }
    async function getFlagAndSubscriptionInfo(customerData) {
        console.log("customerData:", customerData)
        let priceMap = [
            {
                price: "720",
                term: "annually"
            },
            {
                price: "239.88",
                term: "annually"
            },
            {
                price: "225",
                term: "quarterly"
            },
            {
                price: "179.88",
                term: "annually"
            },
            {
                price: "0.01",
                term: "annually"
            },
            {
                price: "30",
                term: "monthly"
            },
            {
                price: "29.99",
                term: "monthly"
            },
            {
                price: "75",
                term: "monthly"
            },
            {
                price: "0.02",
                term: "monthly"
            }
        ]
        let todaysDate = new Date();
        let todaysIsoDate = todaysDate.toISOString()

        let merchantid = customerData?.result?.profile?.merchantCustomerId ? customerData?.result?.profile?.merchantCustomerId : null //for new users no merchant id
        let AuthorizeNextImport = merchantid ? true : false
        let transactions = customerData?.transactionHistory?.data?.transactions
        console.log("customerData:", customerData)
        let subscription = customerData?.customerSubscription?.data?.subscription
        let lastTransactionPrice, firstTransactionDate, lastTransactionDate, nextPaymentDate
        if (subscription) {
            console.log("subscription:", subscription)
            lastTransactionPrice = subscription.amount.toString()
            nextPaymentDate = new Date(subscription.paymentSchedule.startDate) ?? todaysIsoDate
        } else {
            let lastTransactions = transactions ? transactions[0] : null // most recent transaction
            let firstTransaction = transactions ? transactions[transactions.length - 1] : null //oldest transaction
            firstTransactionDate = firstTransaction ? new Date(firstTransaction?.submitTimeLocal) : todaysIsoDate
            lastTransactionDate = lastTransactions ? new Date(lastTransactions?.submitTimeLocal) : todaysIsoDate
            lastTransactionPrice = lastTransactions ? lastTransactions?.settleAmount.toString() : '0'
        }
        let matchedTerm = priceMap.find(item => item.price === lastTransactionPrice)?.term;
        
        let status
        let authorizenetCustomerId = customerData?.result?.profile?.customerProfileId
        if (subscription) {
            if (matchedTerm) {
                if (matchedTerm == "monthly") {
                    lastTransactionDate = new Date(nextPaymentDate);
                    lastTransactionDate.setMonth(nextPaymentDate.getMonth() - 1);
                } else if (matchedTerm == "quarterly") {
                    lastTransactionDate = new Date(nextPaymentDate);
                    lastTransactionDate.setMonth(nextPaymentDate.getMonth() - 3);
                } else if (matchedTerm == "annually") {
                    lastTransactionDate = new Date(nextPaymentDate);
                    lastTransactionDate.setMonth(nextPaymentDate.getFullYear() - 1);
                } else {
                    //return new amount found, contact admin
                }
            }
        } else {
            if (matchedTerm) {
                if (matchedTerm == "monthly") {
                    nextPaymentDate = new Date(lastTransactionDate);
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                } else if (matchedTerm == "quarterly") {
                    nextPaymentDate = new Date(lastTransactionDate);
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
                } else if (matchedTerm == "annually") {
                    nextPaymentDate = new Date(lastTransactionDate);
                    nextPaymentDate.setMonth(nextPaymentDate.getFullYear() + 1);
                } else {
                    //return new amount found, contact admin
                }
            }
        }

        console.log("nextPaymentDate:", nextPaymentDate)
        if (nextPaymentDate < todaysIsoDate) {
            //don't create a subscription
            status = "inactive"
        } else {
            //create a subscription
            status = "active"
        }
        console.log("??????", {
            merchantid: merchantid,
            AuthorizeNextImport: AuthorizeNextImport,
            lastTransactionDate: lastTransactionDate,
            lastTransactionPrice: lastTransactionPrice,
            matchedTerm: matchedTerm,
            nextPaymentDate: nextPaymentDate,
            status: status,
            authorizenetCustomerId: authorizenetCustomerId,
            todaysIsoDate: todaysIsoDate,
            firstTransactionDate: firstTransactionDate
        })
        return (
            {
                merchantid: merchantid,
                AuthorizeNextImport: AuthorizeNextImport,
                lastTransactionDate: lastTransactionDate,
                lastTransactionPrice: lastTransactionPrice,
                matchedTerm: matchedTerm,
                nextPaymentDate: nextPaymentDate,
                status: status,
                authorizenetCustomerId: authorizenetCustomerId,
                todaysIsoDate: todaysIsoDate,
                firstTransactionDate: firstTransactionDate
            }
        )

    }
    async function getCustomerSubscriptionFromAuthorize(subscriptionId) {
        console.log("inside getCustomerSubscriptionFromAuthorize")
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
                // console.log("apiResponse in getCustomerSubscriptionFromAuthorize:", apiResponse)
                let sampleResponse = {
                    subscription: {
                        name: 'test',
                        paymentSchedule: {
                            interval: [Object],
                            startDate: '2026-02-19T00:00:00',
                            totalOccurrences: 9999,
                            trialOccurrences: 0
                        },
                        amount: 0.02,
                        trialAmount: 0,
                        status: 'active',
                        profile: {
                            paymentProfile: [Object],
                            shippingProfile: [Object],
                            customerProfileId: '803450130',
                            email: 'gw3789456@tlchatt.com'
                        }
                    },
                    messages: { resultCode: 'Ok', message: [[Object]] }
                }
                return { status: true, data: apiResponse }
            }

        } catch (error) {
            return { status: false, data: error }
        }
    }
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
                console.log("written")
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
    async function getTransactionHistory(result) {
        console.log("inside getTransactionHistory", result?.data?.profile?.customerProfileId)
        var paging = new ApiContracts.Paging();
        paging.setLimit(10);
        paging.setOffset(1);

        var sorting = new ApiContracts.TransactionListSorting();
        sorting.setOrderBy(ApiContracts.TransactionListOrderFieldEnum.ID);
        sorting.setOrderDescending(true);

        var getRequest = new ApiContracts.GetTransactionListForCustomerRequest();
        let merchantAuth = await authorizePaymentAuthentication()
        getRequest.setMerchantAuthentication(merchantAuth);
        getRequest.setCustomerProfileId(result?.data?.profile?.customerProfileId);
        getRequest.setPaging(paging);
        getRequest.setSorting(sorting);

        var ctrl = new ApiControllers.GetTransactionDetailsController(getRequest.getJSON());
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
                // console.log("apiResponse in getTransactionHistory:", apiResponse)
                let sampleResponse = {
                    transactions: [
                        {
                            transId: '81011742389',
                            submitTimeUTC: '2025-04-25T20:16:04.667Z',
                            submitTimeLocal: '2025-04-25T13:16:04.667',
                            transactionStatus: 'generalError',
                            invoiceNumber: 'GB429362',
                            firstName: 'Ellis',
                            lastName: 'Carpenter',
                            accountType: 'Visa',
                            accountNumber: 'XXXX6384',
                            settleAmount: 179.88,
                            marketType: 'eCommerce',
                            product: 'Card Not Present',
                            profile: [Object]
                        },
                        {
                            transId: '81006716988',
                            submitTimeUTC: '2025-04-22T20:15:05.517Z',
                            submitTimeLocal: '2025-04-22T13:15:05.517',
                            transactionStatus: 'generalError',
                            invoiceNumber: 'GB429362',
                            firstName: 'Ellis',
                            lastName: 'Carpenter',
                            accountType: 'Visa',
                            accountNumber: 'XXXX6384',
                            settleAmount: 179.88,
                            marketType: 'eCommerce',
                            product: 'Card Not Present',
                            profile: [Object]
                        },
                        {
                            transId: '80406964637',
                            submitTimeUTC: '2024-04-22T20:14:47.51Z',
                            submitTimeLocal: '2024-04-22T13:14:47.51',
                            transactionStatus: 'settledSuccessfully',
                            invoiceNumber: 'GB409166',
                            firstName: 'Ellis',
                            lastName: 'Carpenter',
                            accountType: 'Visa',
                            accountNumber: 'XXXX6384',
                            settleAmount: 179.88,
                            marketType: 'eCommerce',
                            product: 'Card Not Present',
                            profile: [Object]
                        },
                        {
                            transId: '44063156914',
                            submitTimeUTC: '2023-04-18T23:02:05.037Z',
                            submitTimeLocal: '2023-04-18T16:02:05.037',
                            transactionStatus: 'generalError',
                            invoiceNumber: 'GB409166',
                            firstName: 'Ellis W Carpenter',
                            accountType: 'Visa',
                            accountNumber: 'XXXX6879',
                            settleAmount: 179.88,
                            marketType: 'eCommerce',
                            product: 'Card Not Present',
                            profile: [Object]
                        },
                        {
                            transId: '44058020765',
                            submitTimeUTC: '2023-04-15T23:01:05.523Z',
                            submitTimeLocal: '2023-04-15T16:01:05.523',
                            transactionStatus: 'generalError',
                            invoiceNumber: 'GB409166',
                            firstName: 'Ellis W Carpenter',
                            accountType: 'Visa',
                            accountNumber: 'XXXX6879',
                            settleAmount: 179.88,
                            marketType: 'eCommerce',
                            product: 'Card Not Present',
                            profile: [Object]
                        }
                    ],
                    totalNumInResultSet: 6,
                    messages: { resultCode: 'Ok', message: [[Object]] }
                }
                return { status: true, data: apiResponse }

            }
        } catch (error) {
            return { status: false, data: error }
        }

    }
}


