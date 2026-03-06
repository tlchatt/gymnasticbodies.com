'use server'
import { APIContracts as ApiContracts, APIControllers as ApiControllers, Constants as SDKConstants } from 'authorizenet';
import path from 'path';
import { promises as fs } from 'fs';
import generatePassword from 'generate-password';

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
export async function createSubscriptionInAuthorize(authorizeCustomerIs, impInfo) {
    console.log("inside createSubscriptionInAuthorize", authorizeCustomerIs?.data?.customerProfileId)

    let profileId = authorizeCustomerIs.data.customerPaymentProfileIdList ? authorizeCustomerIs.data.customerPaymentProfileIdList[0] : "N/A"
    let shippingId = authorizeCustomerIs.data.customerShippingAddressIdList ? authorizeCustomerIs.data.customerShippingAddressIdList[0] : "N/A"
    let startDate

    console.log("profileId:", profileId)
    console.log("shippingId:", shippingId)

    let termLength = impInfo.matchedTerm == "quarterly" ? "3" : impInfo.matchedTerm == "annually" ? "12" : impInfo.matchedTerm == "monthly" ? "1" : "0"

    var interval = new ApiContracts.PaymentScheduleType.Interval();
    interval.setLength(termLength);
    interval.setUnit(ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

    if (impInfo.lastTransactionDate) {
        if (impInfo.lastTransactionDate instanceof Date) {//if value is a date, convert to string
            startDate = impInfo.lastTransactionDate.toISOString().split('T')[0];
            // Use dateStr
        } else {
            startDate = impInfo.lastTransactionDate.split('T')[0]//start date coul be in the future
        }
    } else {
        startDate = new Date().toISOString().split('T')[0]; //todays date
    }

    console.log("startDate:", startDate)
    console.log("interval:", interval)

    var paymentScheduleType = new ApiContracts.PaymentScheduleType();
    paymentScheduleType.setInterval(interval);
    paymentScheduleType.setStartDate(startDate);
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
export async function passwordCreation() {
    let password = generatePassword.generate({//https://www.npmjs.com/package/generate-password
        length: 10,//for better auth 8 is min characters required
        numbers: true,
        symbols: true,
        strict: true
    });
    return password
}