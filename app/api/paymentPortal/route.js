// import { ApiContracts } from "authorizenet";

import { APIContracts as ApiContracts, APIControllers as ApiControllers, Constants as SDKConstants } from 'authorizenet';
import Axios from 'axios'
import { NextResponse } from 'next/server';
import allAuthorizeData from '../../../../data/allAuthorizeData.json'

// const NEWAPI = process.env.REACT_APP_API_NEW
let testUrl = process.env.NEXT_PUBLIC_API_URL


export async function POST(request) {
    // const data = await request.text();
    const params = await request.formData()
    console.log("params is:", params)
    let reason = params.get('reason')
    console.log("reason:", reason)

    const authData = {
        dataValue: params.get('dataValue'),
        dataDescriptor: params.get('dataDescriptor')
    }
    const incomingData = {
        firstName: params.get('billToFirstName'),
        lastName: params.get('billToLastName'),
        amount: params.get('billAmount'),
        email: params.get('billEmail'),
        phone: params.get('billPhone'),
        country: params.get('billCountry'),
        term: params.get('billTerm'),
        startDate: params.get('billStartDate'),
        password: params.get('userPassword')
    };

    let merchantAuth = await authorizePaymentAuthentication();

    /*
        transaction success
        //create customer
        //customer created successfully
        //create subscription
        //create subscription successfully
        //create user in db with all the needed details
        //subscription creation failed
        //return transaction success messsage but customer creation success message with subscription creation failed reason
        //customer creation failed
        //return transaction success messsage but customer creation failed reason
        //transaction failed
        //return error to frontend
    */

    //define variables
    let customerSubscriptionStatus, authorizationTransactionIs, authorizeCustomerIs, subscriptionForCustomer, userInNeon, impInfo, customerData, customerSubscription, customerInfoFromAuthorize

    if (reason == "createSubscription") {
        let authorizeCustomerIs = {
            data: {
                customerProfileId: params.get('customerProfileId'),
                customerPaymentProfileIdList: [
                    params.get('customerPaymentProfileId')
                ],
                customerShippingAddressIdList: [
                    params.get('customerShippingAddressId')
                ]
            }
        }

        let subscriptionForCustomer = await createSubscriptionInAuthorize(authorizeCustomerIs)
        console.log("subscriptionForCustomer for reason createSubscription::", subscriptionForCustomer)
        if (subscriptionForCustomer.status) {
            //update info in neon database for future fetch frontend
            // let userInNeon = await createUserInDB(subscriptionForCustomer)
            // console.log("userInNeon:", userInNeon)
            return NextResponse.json({
                message: 'subscription created',
                data: {
                    email: incomingData.email,
                    subscriptionCreated: true,
                }
            }, { status: 200 });
        } else {
            return NextResponse.json({
                subscriptionCreated: false,
                message: 'subscription creation failed',
                error: subscriptionForCustomer.data
            }, { status: 200 });
        }
    } else {
        //check if user is in allAuthorizeData.
        //(yes)check if customerSubscription found in data returned
        //check status in the subscription data
        //(active) return message "Already have a Subscription"
        //(any thing else) do a transaction
        //in authorize 
        //- create transaction
        //- create customer
        //- create subscription - MOVE THIS PART?
        //- create user in neon db
        //-- (flag) add AuthorizeNextImport - customer from authorize has merchantid than AuthorizeNextImport is true, else its false
        //---- check last transaction
        //---- get last transaction price and last payment date (submitTimeLocal)
        //---- map to following term based on the price
        //----- 720 - annually
        //----- 239.88 - annually
        //----- 225 - quarterly
        //----- 179.88 - annually
        //----- 179 - yearly (coupon: $60.88, original price: $239.88) - brainTree
        //----- 154.89 - braintree
        //----- 99.99 - thrive nutrition
        //----- 30 - per month
        //----- 29.99 - per month
        //----- 75 - per month //check with mr. wiley, doesn't seem right
        //---- calculate next payment date based on the term from step above
        //---- if next payment date less than todays date
        //---- (yes) don't create a subscription
        //---- (flag) add status - inactive
        //---- (flag) add authorizenetCustomerId - "authorize customerId"
        //---- (no) create a subscription
        //---- (flag) add status - active
        //---- (flag) add authorizenetCustomerId - "authorize customerId"

        customerData = allAuthorizeData.find(data => data.result.profile.email === incomingData.email);
        console.log("customerData from allAuthorizeData:", customerData)

        customerSubscription = customerData?.customerSubscription


        if (customerSubscription) {
            customerSubscriptionStatus = customerData?.customerSubscription?.data?.subscription?.status
        }
        if (customerSubscriptionStatus != "active") {
            authorizationTransactionIs = await createAuthorizeTransaction()
            console.log("authorizationTransactionIs:", authorizationTransactionIs)
            if (authorizationTransactionIs.status) {
                authorizeCustomerIs = await createCustomerInAuthorize(authorizationTransactionIs) //takes transactionId from authorizationTransactionIs
                console.log("authorizeCustomerIs:", authorizeCustomerIs)
                if (authorizeCustomerIs.status) {
                    //get flag and subscription info for later
                    impInfo = await getFlagAndSubscriptionInfo(authorizeCustomerIs)
                    console.log("impInfo:", impInfo)
                    if (impInfo.status == "active") {
                        subscriptionForCustomer = await createSubscriptionInAuthorize(authorizeCustomerIs, impInfo)
                        console.log("subscriptionForCustomer:", subscriptionForCustomer)
                    } else {
                        console.log("inacitve customer impInfo:", impInfo)
                    }

                    if (subscriptionForCustomer.status) {
                        //store info in neon database for future fetch frontend
                        userInNeon = await createUserInDB(subscriptionForCustomer, authorizeCustomerIs, impInfo)
                        customerInfoFromAuthorize = await getCustomerFromAuthorize(impInfo.authorizenetCustomerId);
                        console.log("userInNeon:", userInNeon)
                        let billTo = customerInfoFromAuthorize?.data?.profile?.paymentProfiles?.[0]?.billTo
                        return NextResponse.json({
                            message: 'Transaction successful, customer created, subscription created',
                            data: {
                                email: incomingData.email,
                                transaction: true,
                                transactionId: authorizationTransactionIs.data.transId,
                                customerId: authorizeCustomerIs,
                                subscriptionId: subscriptionForCustomer,
                                customerCreated: true,
                                subscriptionCreated: true,
                                userInNeon:userInNeon,
                                token: userInNeon?.data?.data?.token,
                                impInfo: impInfo,
                                firstName: billTo?.firstName ?? "N/A"
                            }
                        }, { status: 200 });
                    } else {
                        return NextResponse.json({
                            transaction: true,
                            transactionId: authorizationTransactionIs.data.transId,
                            customerCreated: true,
                            customerId: authorizeCustomerIs,
                            subscriptionCreated: false,
                            message: 'Transaction successful, customer created, but subscription creation failed',
                            error: subscriptionForCustomer,
                            impInfo: impInfo
                        }, { status: 200 });
                    }
                } else {
                    return NextResponse.json({
                        message: 'Transaction successful, but customer creation failed',
                        transaction: true,
                        transactionId: authorizationTransactionIs.data.transId,
                        customerCreated: false,
                        subscriptionCreated: false,
                        error: authorizeCustomerIs,
                        data: authorizationTransactionIs.data
                    }, { status: 200 });
                }
            } else {
                return NextResponse.json({
                    message: 'Transaction failed',
                    transaction: false,
                    customerCreated: false,
                    subscriptionCreated: false,
                    error: authorizationTransactionIs.data
                }, { status: 200 });

            }
        }
        if (customerSubscriptionStatus == "active") {
            impInfo = await getFlagAndSubscriptionInfo(customerData)
            //return message "Already have a Subscription"
            return NextResponse.json({
                message: 'You have an Active Subscription!',
                transaction: false,
                customerCreated: false,
                subscriptionCreated: false,
                error: "Already has a subscription",
                impInfo: impInfo
            }, { status: 200 });
        }

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
    async function createAuthorizeTransaction() {
        var opaqueData = new ApiContracts.OpaqueDataType();
        opaqueData.setDataDescriptor(authData.dataDescriptor);
        opaqueData.setDataValue(authData.dataValue);

        const paymentType = new ApiContracts.PaymentType();
        paymentType.setOpaqueData(opaqueData);

        var billTo = new ApiContracts.CustomerAddressType();
        billTo.setFirstName(incomingData.firstName);
        billTo.setLastName(incomingData.lastName);
        billTo.setCountry(incomingData.country);
        billTo.setEmail(incomingData.email);
        billTo.setPhoneNumber(incomingData.phone);

        var transactionRequestType = new ApiContracts.TransactionRequestType();
        transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
        transactionRequestType.setPayment(paymentType);
        transactionRequestType.setAmount(incomingData.amount);
        transactionRequestType.setBillTo(billTo);

        const createRequest = new ApiContracts.CreateTransactionRequest();
        createRequest.setMerchantAuthentication(merchantAuth);
        createRequest.setTransactionRequest(transactionRequestType);

        const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);
        let result = null
        try {
            const apiResponse = await new Promise((resolve, reject) => {
                ctrl.execute(() => {
                    resolve(ctrl.getResponse());
                }, (error) => {
                    console.log("error for transaction:", error)
                    reject(error);
                });
            });
            const message = apiResponse.messages.message[0];
            if (apiResponse.messages.resultCode === "Error") {
                
                console.log("message in createAuthorizeTransaction:", message);
                // return { status: false, data: apiResponse }
                result = { status: false, data: apiResponse }
            } else {
                
                console.log("message when transaction resultCode is OK:",message)
                result = { status: true, data: apiResponse }
                // return { status: true, data: apiResponse }
            }

        } catch (error) {
            // return { status: false, data: error }
            result = { status: false, data: error }
        }
        return result
    }
    async function createCustomerInAuthorize(authorizationTransactionIs) {
        const clientId = process.env.AUTHORIZE_NET_API_CLIENT_ID;
        var createRequestForCustomer = new ApiContracts.CreateCustomerProfileFromTransactionRequest();
        createRequestForCustomer.setMerchantAuthentication(merchantAuth);
        createRequestForCustomer.setTransId(authorizationTransactionIs.data.transactionResponse.transId);
        createRequestForCustomer.setClientId(clientId);
        createRequestForCustomer.setCustomer({ email: incomingData.email });

        let ctrl = new ApiControllers.CreateCustomerProfileFromTransactionController(createRequestForCustomer.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);
        let result = null
        try {
            const apiResponse = await new Promise((resolve, reject) => {
                ctrl.execute(() => {
                    resolve(ctrl.getResponse());

                }, (error) => {
                    console.log("error for create customer in Authorize:", error)
                    reject(error);
                });
            });
            /*apiResponse in customer: {
                customerProfileId: '803396740',
                customerPaymentProfileIdList: [ '1356475745' ],
                customerShippingAddressIdList: [ '1349925379' ],
                validationDirectResponseList: [],
                messages: { resultCode: 'Ok', message: [ [Object] ] }
              }*/

            if (apiResponse.messages.resultCode === "Error") {
                const message = apiResponse.messages.message[0];
                console.log("message in createCustomerInAuthorize:", message);
                // return { status: false, data: apiResponse }
                result = { status: false, data: apiResponse }
            } else {
                // return { status: true, data: apiResponse }
                result = { status: true, data: apiResponse }
            }
        } catch (error) {
            result = { status: false, data: error }
            // return { status: false, data: error }
        }
        return result
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
        if (customerData) {

        }
        let merchantid = customerData?.result?.profile?.merchantCustomerId ? customerData?.result?.profile?.merchantCustomerId : null //for new users no merchant id
        let AuthorizeNextImport = merchantid ? true : false
        let transactions = customerData?.transactionHistory?.data?.transactions
        let lastTransactions = transactions ? transactions[0] : null // most recent transaction
        let firstTransaction = transactions ? transactions[transactions.length - 1] : null //oldest transaction
        let firstTransactionDate = firstTransaction ? new Date(firstTransaction?.submitTimeLocal) : todaysIsoDate
        let lastTransactionDate = lastTransactions ? new Date(lastTransactions?.submitTimeLocal) : todaysIsoDate
        let lastTransactionPrice = lastTransactions ? lastTransactions?.settleAmount.toString() : incomingData.amount.toString();
        let matchedTerm = priceMap.find(item => item.price === lastTransactionPrice)?.term;
        let nextPaymentDate
        let status
        let authorizenetCustomerId = customerData?.result?.profile?.customerProfileId ? customerData?.result?.profile?.customerProfileId : authorizeCustomerIs?.data?.customerProfileId
        if (matchedTerm) {
            if (matchedTerm == "monthly") {
                nextPaymentDate = new Date(lastTransactionDate);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            } else if (matchedTerm == "quarterly") {
                nextPaymentDate = new Date(lastTransactionDate);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
            } else if (matchedTerm == "annually") {
                nextPaymentDate = new Date(lastTransactionDate);
                nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            } else {
                //return new amount found, contact admin
            }
        }

        if (nextPaymentDate < todaysIsoDate) {
            //don't create a subscription
            status = "inactive"
        } else {
            //create a subscription
            status = "active"
        }
        return (
            {
                merchantid: merchantid,
                AuthorizeNextImport: AuthorizeNextImport,
                lastTransactionDate: lastTransactionDate,
                lastTransactionPrice: lastTransactionPrice,
                firstTransactionDate: firstTransactionDate,
                todaysIsoDate: todaysIsoDate,
                matchedTerm: matchedTerm,
                nextPaymentDate: nextPaymentDate,
                status: status,
                authorizenetCustomerId: authorizenetCustomerId,
                
            }
        )

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
    async function createSubscriptionInAuthorize(authorizeCustomerIs, impInfo) {
        console.log("impInfo:", impInfo)
        console.log("authorizeCustomerIs.data.customerProfileId:", authorizeCustomerIs.data.customerProfileId)

        let profileId = authorizeCustomerIs.data.customerPaymentProfileIdList ? authorizeCustomerIs.data.customerPaymentProfileIdList[0] : "N/A"
        let shippingId = authorizeCustomerIs.data.customerShippingAddressIdList ? authorizeCustomerIs.data.customerShippingAddressIdList[0] : "N/A"

        console.log("profileId:", profileId)
        console.log("shippingId:", shippingId)

        // let term = incomingData.term == "quarterly" ? "months" : "days";
        let termLength = impInfo.matchedTerm == "quarterly" ? "3" : impInfo.matchedTerm == "annually" ? "12" : impInfo.matchedTerm == "monthly" ? "1" : "0"

        var interval = new ApiContracts.PaymentScheduleType.Interval();
        interval.setLength(termLength);
        interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);
        console.log("incomingData.startDate:", incomingData.startDate)
        console.log("termLength:", termLength)
        let xmlDate
        // if (incomingData.startDate) {
        //     xmlDate = incomingData.startDate.split('T')[0]//start date already exists
        // } else {
        //     xmlDate = new Date().toISOString().split('T')[0]; //todays date
        // }
        if (impInfo.nextPaymentDate) {
            xmlDate = impInfo.nextPaymentDate.toISOString().split('T')[0]//start date is in the future
        } else {
            xmlDate = new Date().toISOString().split('T')[0]; //todays date
        }

        console.log("xmlDate:", xmlDate)
        console.log("interval:", interval)

        var paymentScheduleType = new ApiContracts.PaymentScheduleType();
        paymentScheduleType.setInterval(interval);
        paymentScheduleType.setStartDate(xmlDate);
        paymentScheduleType.setTotalOccurrences("9999");
        paymentScheduleType.setTrialOccurrences(0);

        var customerProfileIdType = new ApiContracts.CustomerProfileIdType();
        customerProfileIdType.setCustomerProfileId(authorizeCustomerIs.data.customerProfileId);
        if (profileId != "N/A") {
            customerProfileIdType.setCustomerPaymentProfileId(profileId);
        }
        if (shippingId != "N/A") {
            customerProfileIdType.setCustomerAddressId(shippingId);
        }
        // var billTo = new ApiContracts.CustomerAddressType();
        // billTo.setLastName(incomingData.lastName);

        var arbSubscription = new ApiContracts.ARBSubscriptionType();

        let subscriptionName = "GymFit TV - $" + impInfo?.lastTransactionPrice + " / " + impInfo?.matchedTerm
        arbSubscription.setName(subscriptionName);
        arbSubscription.setPaymentSchedule(paymentScheduleType);
        arbSubscription.setAmount(impInfo?.lastTransactionPrice);
        arbSubscription.setTrialAmount('0');
        arbSubscription.setProfile(customerProfileIdType);
        // arbSubscription.setBillTo(billTo);

        var createRequest = new ApiContracts.ARBCreateSubscriptionRequest();
        createRequest.setMerchantAuthentication(merchantAuth);
        createRequest.setSubscription(arbSubscription);

        var ctrl = new ApiControllers.ARBCreateSubscriptionController(createRequest.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);
        let result = null
        try {
            const apiResponse = await new Promise((resolve, reject) => {
                ctrl.execute(() => {
                    resolve(ctrl.getResponse());

                }, (error) => {
                    console.log("error for transaction:", error)
                    reject(error);
                });
            });

            var response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

            /*apiResponse in customer: {
                customerProfileId: '803396740',
                customerPaymentProfileIdList: [ '1356475745' ],
                customerShippingAddressIdList: [ '1349925379' ],
                validationDirectResponseList: [],
                messages: { resultCode: 'Ok', message: [ [Object] ] }
              }*/
            if (apiResponse.messages.resultCode === "Error") {
                const message = response.messages.message[0];
                console.log("message:", message);
                // return { status: false, data: response }
                result = { status: false, data: response }
            } else {
                // return { status: true, data: response }
                result = { status: true, data: response }
            }
        } catch (error) {
            // return { status: false, data: error }
            result = { status: false, data: error }
        }
        return result;
    }

    async function createUserInDB(subscriptionForCustomer, authorizeCustomerIs, impInfo) {
        const config = {
            headers: {
                "Content-Type": "application/json"
            }
        }
        // const currentDate = new Date();
        // let nextPaymentDate;

        // if (incomingData.term === 'monthly') {
        //     nextPaymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate()).toISOString();
        // } else if (incomingData.term === 'yearly') {
        //     nextPaymentDate = new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), currentDate.getDate()).toISOString();
        // }
        // console.log("subscriptionForCustomer.data[profile]:", subscriptionForCustomer.data["profile"])
        // console.log("subscriptionForCustomer:", subscriptionForCustomer)
        // console.log("authorizeCustomerIs:", authorizeCustomerIs)
        let data = {
            status: impInfo.status,
            password: incomingData.password,
            next_payment_date_gmt: impInfo.nextPaymentDate,
            date_created_gmt: impInfo.firstTransactionDate,
            start_date_gmt: impInfo.firstTransactionDate,
            // date_created_gmt: new Date().toLocaleString('en-CA', { hour12: false }).replace(', ', 'T'),
            // start_date_gmt: new Date().toLocaleString('en-US', { hour12: false, timeZone: 'America/New_York' }).replace(', ', 'T'),
            end_date_gmt: impInfo.nextPaymentDate,
            billing: {
                first_name: incomingData.firstName,
                last_name: incomingData.lastName,
                email: incomingData.email
            },
            country: incomingData.country,
            phone: incomingData.phone,
            term: incomingData.term,
            profile: subscriptionForCustomer.data["profile"],
            subscriptionId: subscriptionForCustomer.data["subscriptionId"],
            authorizeNextImport: impInfo.AuthorizeNextImport,
            authorizeCustomerId: impInfo.authorizenetCustomerId
        }
        let result = null
        try {
            // const response = await Axios.post(NEWAPI + '/api/user/subscription', data, config);
            const response = await fetch(testUrl + '/api/user/subscription', {
                method: 'POST',
                config,
                body: JSON.stringify(data)
            })
            console.log("res is:", response.status)
            console.log("res status:", response.statusText)
            // return { status: true, data: response };
            const responseData = await response.json();
            console.log("response data is:", responseData);
            result = { status: true, data: responseData };
        } catch (error) {
            console.error("Error:", error);
            // return { status: false, data: error };
            result = { status: false, data: error }
        }
        return result
        // const dbresponse = Axios.post(NEWAPI + '/api/user/subscription', data, config).then((res) => {
        //     console.log("res is:", res.status)
        //     console.log("res status:", res.statusText)
        //     return { status: true, data: res }
        //     // return NextResponse.json({ message: 'Success', data: dbresponse.data });
        // })
        //     .catch((error) => {
        //         // return NextResponse.json({ message: 'Error', error }, { status: 500 });
        //         return { status: false, data: error }
        //     });
    }

}
// GET just to return 200 status for preflight to work
export async function GET() {
    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}





