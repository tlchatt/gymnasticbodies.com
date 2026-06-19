'use server'
import { APIContracts as ApiContracts, APIControllers as ApiControllers, Constants as SDKConstants } from 'authorizenet';
import path from 'path';
import { promises as fs } from 'fs';
import generatePassword from 'generate-password';
import { put } from '@vercel/blob'
import { getFlagAndSubscriptionInfo } from './commonFunctions';
import { createAndModifyUserInNeon } from './userSettings';
import { SubscriptOutlined } from '@mui/icons-material';

export async function authorizePaymentAuthentication() {
    // Set up the merchant authentication
    const apiLoginId = process.env.AUTHORIZE_NET_API_LOGIN_ID;
    const transactionKey = process.env.AUTHORIZE_NET_TRANSACTION_KEY;

    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(apiLoginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    return merchantAuthenticationType
}
export async function createAuthorizeTransaction(authData, incomingData, merchantAuth) {
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

            console.log("message when transaction resultCode is OK:", message)
            result = { status: true, data: apiResponse }
            // return { status: true, data: apiResponse }
        }

    } catch (error) {
        // return { status: false, data: error }
        result = { status: false, data: error }
    }
    return result
}
export async function voidAuthorizeTransaction(transactionId) {
    let merchantAuth = await authorizePaymentAuthentication()

    var transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);
    transactionRequestType.setRefTransId(transactionId);

    var createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuth);
    createRequest.setTransactionRequest(transactionRequestType);

    var ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
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

            console.log("message when transaction resultCode is OK:", message)
            result = { status: true, data: apiResponse }
            // return { status: true, data: apiResponse }
        }

    } catch (error) {
        // return { status: false, data: error }
        result = { status: false, data: error }
    }
    return result
}
export async function CancelSubscriptionInAuthorize(subscriptionId) {

    let merchantAuth = await authorizePaymentAuthentication()

    var cancelRequest = new ApiContracts.ARBCancelSubscriptionRequest();
    cancelRequest.setMerchantAuthentication(merchantAuth);
    cancelRequest.setSubscriptionId(subscriptionId);

    var ctrl = new ApiControllers.CreateTransactionController(cancelRequest.getJSON());
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

            console.log("message when transaction resultCode is OK:", message)
            result = { status: true, data: apiResponse }
            // return { status: true, data: apiResponse }
        }

    } catch (error) {
        // return { status: false, data: error }
        result = { status: false, data: error }
    }
    return result
}
export async function createCustomerInAuthorize(merchantAuth, authorizationTransactionIs, incomingData) {
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
export async function getCustomerFromAuthorize(customerProfileId) {
    console.log("inside getCustomerFromAuthorize", customerProfileId)
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
export async function getCustomerSubscriptionFromAuthorize(subscriptionId) {
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
export async function getTransactionHistory(result) {
    console.log("inside getTransactionHistory", result?.data?.profile?.customerProfileId)
    var paging = new ApiContracts.Paging();
    paging.setLimit(10);
    paging.setOffset(1);

    var sorting = new ApiContracts.TransactionListSorting();
    sorting.setOrderBy(ApiContracts.TransactionListOrderFieldEnum.ID);
    sorting.setOrderDescending(false);

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
export async function getAllDataFromFile(email) {
    console.log("email inside getAllDataFromFile:", email)
    console.log("process.cwd():", process.cwd())
    const filePath = path.join(process.cwd(), 'data', 'allAuthorizeData.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const allAuthorizeData = JSON.parse(fileContents);
    console.log("allAuthorizeData length:", allAuthorizeData.length)
    let customerData = allAuthorizeData.find(data => data.result.profile.email === email);
    console.log("customerData:", customerData)
    return customerData
}
export async function createSubscriptionInAuthorize(authorizeCustomerIs, impInfo, authorizationTransactionIs) {
    console.log("authorizeCustomerIs inside createSubscriptionInAuthorize:", authorizeCustomerIs)
    // console.log("inside createSubscriptionInAuthorize", authorizeCustomerIs?.data?.customerProfileId)

    let paymentProfileId = authorizeCustomerIs?.data?.customerPaymentProfileIdList ? authorizeCustomerIs?.data?.customerPaymentProfileIdList[0] : "N/A"
    let shippingId = authorizeCustomerIs?.data?.customerShippingAddressIdList ? authorizeCustomerIs?.data?.customerShippingAddressIdList[0] : "N/A"
    let customerProfileId = authorizeCustomerIs?.data?.customerProfileId ? authorizeCustomerIs?.data?.customerProfileId : "N/A"
    let startDate

    console.log("paymentProfileId:", paymentProfileId)
    console.log("shippingId:", shippingId)
    console.log("customerProfileId:", customerProfileId)

    let termLength = impInfo.matchedTerm == "quarterly" ? "3" : impInfo.matchedTerm == "annually" ? "12" : impInfo.matchedTerm == "monthly" ? "1" : "0"

    var interval = new ApiContracts.PaymentScheduleType.Interval();
    interval.setLength(termLength);
    interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

    if (impInfo.recentTransactionDate) {
        if (impInfo.recentTransactionDate instanceof Date) {//if value is a date, convert to string
            startDate = impInfo.recentTransactionDate.toISOString().split('T')[0];
            // Use dateStr
        } else {
            startDate = impInfo.recentTransactionDate.split('T')[0]//start date coul be in the future
        }
    } else {
        startDate = new Date().toISOString().split('T')[0]; //todays date
    }
    //if trial is present start date is 7 days from today, else todays date


    console.log("startDate:", startDate)
    console.log("interval:", interval)


    // var billTo = new ApiContracts.CustomerAddressType();
    // billTo.setLastName(incomingData.lastName);

    let subscription = await createSubscription()
    console.log("subscription:", subscription)

    return subscription

    async function createSubscription() {
        console.log('Start');
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        await delay(5000);
        console.log('Delayed code executed');
        var paymentScheduleType = new ApiContracts.PaymentScheduleType();
        paymentScheduleType.setInterval(interval);
        paymentScheduleType.setStartDate(startDate);
        paymentScheduleType.setTotalOccurrences("9999");
        paymentScheduleType.setTrialOccurrences(0);

        var customerProfileIdType = new ApiContracts.CustomerProfileIdType();
        customerProfileIdType.setCustomerProfileId(customerProfileId);
        if (paymentProfileId != "N/A") {//this is required by authorize
            customerProfileIdType.setCustomerPaymentProfileId(paymentProfileId);
        }
        if (shippingId != "N/A") {//this is required by authorize
            customerProfileIdType.setCustomerAddressId(shippingId);
        }

        var arbSubscription = new ApiContracts.ARBSubscriptionType();

        let subscriptionName = "GymFit TV - $" + impInfo?.price + " / " + impInfo?.matchedTerm
        arbSubscription.setName(subscriptionName);
        arbSubscription.setPaymentSchedule(paymentScheduleType);
        arbSubscription.setAmount(impInfo?.price);
        arbSubscription.setTrialAmount('0');
        arbSubscription.setProfile(customerProfileIdType);
        // arbSubscription.setBillTo(billTo);
        let merchantAuth = await authorizePaymentAuthentication();
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
            console.log("response in createSubscription is:", response)
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
}
export async function passwordCreation() {
    let password = generatePassword.generate({//https://www.npmjs.com/package/generate-password
        length: 10,//for better auth 8 is min characters required
        numbers: true,
        symbols: true,
        strict: true
    });
    return password
}
export async function getAllCustomerDataFromAuthorize(customerId) {//customer / subscription / transaction details
    let customerSubscription = {}, transactionHistory, authorizeCustomer

    authorizeCustomer = await getCustomerFromAuthorize(customerId);
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
    return authorizeData
}
export async function sendMediaToVercel(id, response) {
    // console.log("token: process.env.BLOB_READ_WRITE_TOKEN:",process.env.VERCEL_OIDC_TOKEN)
    console.log("response.body type:", typeof response.body);
    let blob = await put(`${id}.mp4`, response.body, {
        access: 'public',
        // token: process.env.VERCEL_OIDC_TOKEN
    }).then(res => {
        console.log("res:", res)
    }).catch(err => {
        console.log("errddddd is:", err)
    })

    return true
}
export async function uploadToVercelBlob(id, url) {
    try {
        console.log("url is:", url)
        const response = await fetch(url);
        console.log("response:", response)
        const arrayBuffer = await response.arrayBuffer();
        console.log("arrayBuffer:", arrayBuffer)
        const blob = new Blob([arrayBuffer]);
        console.log("blob:", blob)
        let fileName = url?.includes(".mp4") ? `${id}.mp4` : `${id}.jpg`;
        console.log("fileName:", fileName)
        const { url: uploadedUrl } = await put(fileName, blob, {
            token: process.env.VERCEL_BLOB_TOKEN,
            access: 'public',
        });
        console.log("uploadedUrl:", uploadedUrl)
        return uploadedUrl;
    } catch (error) {
        console.error('Error uploading to Vercel Blob:', error);
        throw error;
    }
}
export async function paymentController(formData) {
    let reason = formData.get('reason')
    console.log("formData:", formData, "\nreason:", reason)

    const authData = {
        dataValue: formData.get('dataValue'),
        dataDescriptor: formData.get('dataDescriptor')
    }

    const incomingData = {
        firstName: formData.get('billToFirstName'),
        lastName: formData.get('billToLastName'),
        amount: formData.get('billAmount'),
        email: formData.get('billEmail'),
        phone: formData.get('billPhone'),
        country: formData.get('billCountry'),
        term: formData.get('billTerm'),
        startDate: formData.get('billStartDate'),
        password: formData.get('userPassword'),
        postAWS: formData.get('postAWS'),
        trial: formData.get('trial')
    };
    console.log("incomingData:", incomingData)
    let merchantAuth = await authorizePaymentAuthentication();

    /*
        * transaction success
        * create customer
        * customer created successfully
        * create subscription
        * create subscription successfully
        * create user in db with all the needed details
        //subscription creation failed
        //return transaction success messsage but customer creation success message with subscription creation failed reason
        //customer creation failed
        //return transaction success messsage but customer creation failed reason
        //transaction failed
        //return error to frontend
    */

    //define variables
    let customerSubscriptionStatus, authorizationTransactionIs, authorizeCustomerIs, subscriptionForCustomer, userInNeon, impInfo, customerData, customerSubscription, customerTransaction, customerProfile, customerInfoFromAuthorize

    if (reason == "createSubscription") {//review again, might error
        let authorizeCustomerIs = {
            data: {
                customerProfileId: formData.get('customerProfileId'),
                customerPaymentProfileIdList: [
                    formData.get('customerPaymentProfileId')
                ],
                customerShippingAddressIdList: [
                    formData.get('customerShippingAddressId')
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

        customerData = await getAllDataFromFile(incomingData.email)//customerData is AuthorizeCustomerData


        // customerData = allAuthorizeData.find(data => data.result.profile.email === incomingData.email);
        console.log("customerData from allAuthorizeData:", customerData)
        console.log("customerTransaction from allAuthorizeData:", customerTransaction)

        customerSubscription = customerData?.customerSubscription
        customerTransaction = customerData?.transactionHistory
        customerProfile = customerData?.result?.profile

        if (customerProfile) {//customer already present
            impInfo = await getFlagAndSubscriptionInfo(customerData, authorizeCustomerIs, incomingData)
            console.log("impInfo in if customerProfile:", impInfo)
            //return message "Already have a Subscription"
            return {
                message: 'You are already a customer! Please login to update your subscription.',
                transaction: false,
                customerCreated: false,
                subscriptionCreated: false,
                existingCustomer: true,
                impInfo: impInfo
            }
        } else {
            console.log("inside customerSubscriptionStatus new")

            authorizationTransactionIs = await createAuthorizeTransaction(authData, incomingData, merchantAuth)
            console.log("authorizationTransactionIs:", authorizationTransactionIs)
            if (authorizationTransactionIs.status) {
                authorizeCustomerIs = await createCustomerInAuthorize(merchantAuth, authorizationTransactionIs, incomingData) //takes transactionId from authorizationTransactionIs
                console.log("authorizeCustomerIs:", authorizeCustomerIs)
                if (authorizeCustomerIs.status) {
                    //get flag and subscription info for later
                    impInfo = await getFlagAndSubscriptionInfo(customerData, authorizeCustomerIs, incomingData)
                    console.log("impInfo from customerSubscription not active:", impInfo)
                    if (impInfo.status == "active") {
                        subscriptionForCustomer = await createSubscriptionInAuthorize(authorizeCustomerIs, impInfo, authorizationTransactionIs)
                        console.log("subscriptionForCustomer:", subscriptionForCustomer)
                    } else {
                        console.log("inactive customer authorizenetCustomerId", impInfo.authorizenetCustomerId)
                    }

                    if (subscriptionForCustomer.status) {
                        //store info in neon database for future fetch frontend
                        userInNeon = await createAndModifyUserInNeon(incomingData, impInfo, subscriptionForCustomer)

                        customerInfoFromAuthorize = await getCustomerFromAuthorize(impInfo.authorizenetCustomerId);
                        console.log("userInNeon:", userInNeon)
                        let billTo = customerInfoFromAuthorize?.data?.profile?.paymentProfiles?.[0]?.billTo
                        console.log("JSON.stringify", JSON.stringify({
                            message: 'Transaction Successful, Customer Created, Subscription Created',
                            existingCustomer: false,
                            customerCreated: true,
                            subscriptionCreated: true,
                            transaction: true,
                            data: {
                                email: incomingData.email,
                                transactionId: authorizationTransactionIs?.data?.transactionResponse?.transId,
                                customerId: authorizeCustomerIs,
                                subscriptionId: subscriptionForCustomer,
                                userInNeon: userInNeon,
                                token: userInNeon?.data?.data?.token,
                                impInfo: impInfo,
                                firstName: billTo?.firstName ?? "N/A"
                            }
                        }))
                        return {
                            message: 'Transaction Successful, Customer Created, Subscription Created',
                            existingCustomer: false,
                            transaction: true,
                            customerCreated: true,
                            subscriptionCreated: true,
                            data: JSON.stringify({
                                email: incomingData.email,
                                transactionId: authorizationTransactionIs?.data?.transactionResponse?.transId,
                                customerId: authorizeCustomerIs,
                                subscriptionId: subscriptionForCustomer,
                                userInNeon,
                                token: userInNeon?.data?.data?.token,
                                impInfo,
                                firstName: billTo?.firstName ?? "N/A"
                            })
                        };
                    } else {
                        //void the transaction since subscription creation failed and delete the customer that was created
                        await voidAuthorizeTransaction(authorizationTransactionIs.data.transactionResponse.transId)//passes transactionId to void the transaction
                        return {
                            transaction: true,
                            transactionId: authorizationTransactionIs?.data?.transactionResponse?.transId,
                            customerCreated: true,
                            existingCustomer: false,
                            customerId: authorizeCustomerIs,
                            subscriptionCreated: false,
                            message: subscriptionForCustomer?.data?.error?.messages?.[0]?.text,//'Transaction successful, customer created, but subscription creation failed',
                            error: subscriptionForCustomer,
                            impInfo: impInfo
                        }
                    }
                } else {
                    //void the transaction since subscription creation failed 
                    await voidAuthorizeTransaction(authorizationTransactionIs.data.transactionResponse.transId)//passes transactionId to void the transaction
                    return {
                        message: authorizeCustomerIs?.data?.error?.messages?.[0]?.text,//'Transaction successful, but customer creation failed',
                        transaction: true,
                        transactionId: authorizationTransactionIs?.data?.transactionResponse?.transId,
                        customerCreated: false,
                        subscriptionCreated: false,
                        error: authorizeCustomerIs,
                        data: authorizationTransactionIs.data,
                        existingCustomer: false,
                    }
                }
            } else {
                console.log("here??")
                return {
                    message: authorizationTransactionIs?.data?.error?.messages?.[0]?.text,//'Transaction failed',
                    transaction: false,
                    customerCreated: false,
                    subscriptionCreated: false,
                    existingCustomer: false,
                    error: authorizationTransactionIs
                }

            }
        }
    }
}
export async function getAllCustomerIdsFromAuthorize() {
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
export async function getCustomerPaymentProfile(customerProfileId, customerPaymentProfileId) {
    let merchantAuth = await authorizePaymentAuthentication()


    var getRequest = new ApiContracts.GetCustomerPaymentProfileRequest();
    getRequest.setMerchantAuthentication(merchantAuth);

    getRequest.setCustomerProfileId(customerProfileId);
    getRequest.setCustomerPaymentProfileId(customerPaymentProfileId);

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
export async function updateCustomerPaymentProfile(paymentProfile,firstName, lastName,authorizeProfile) {
    console.log("paymentProfile:", paymentProfile)
    console.log("firstName:",firstName)
    console.log("lastName:",lastName)

    let merchantAuth = await authorizePaymentAuthentication()

    var creditCardForUpdate = new ApiContracts.CreditCardType();
    creditCardForUpdate.setCardNumber(paymentProfile?.payment?.creditCard?.cardNumber);
    creditCardForUpdate.setExpirationDate(paymentProfile?.payment?.creditCard?.expirationDate);

    var paymentType = new ApiContracts.PaymentType();
	paymentType.setCreditCard(creditCardForUpdate);

    var customerAddressType = new ApiContracts.CustomerAddressType();
	customerAddressType.setFirstName(firstName);
	customerAddressType.setLastName(lastName);
	customerAddressType.setZip(paymentProfile?.billTo?.zip);
	customerAddressType.setCountry(paymentProfile?.billTo?.country);
	
    var customerForUpdate = new ApiContracts.CustomerPaymentProfileExType();
    customerForUpdate.setPayment(paymentType);
    customerForUpdate.setCustomerPaymentProfileId(paymentProfile?.customerPaymentProfileId);
	customerForUpdate.setBillTo(customerAddressType);


    var updateRequest = new ApiContracts.UpdateCustomerPaymentProfileRequest();
    updateRequest.setMerchantAuthentication(merchantAuth);
    updateRequest.setCustomerProfileId(paymentProfile?.customerProfileId);	
    updateRequest.setPaymentProfile(customerForUpdate);

    console.log("updateRequest:",updateRequest.getJSON())
    var ctrl = new ApiControllers.UpdateCustomerPaymentProfileController(updateRequest.getJSON());
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
            console.log("message in updateCustomerPaymentProfile:", message);
            return { status: false, data: apiResponse }
        } else {
            console.log("apiResponse in updateCustomerPaymentProfile:", apiResponse)
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