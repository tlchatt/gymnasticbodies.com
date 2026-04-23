
import pkg from 'authorizenet';
const { APIContracts: ApiContracts, APIControllers: ApiControllers, Constants: SDKConstants } = pkg;
import { promises as fs } from 'fs';
import path from 'path';
import { writeQueue } from './lib/writeFile.js';



let ids = await getAllCustomerIdsFromAuthorize()//6466

let count = 0
let finalArray = [];

for (const id of ids?.data?.ids) {
    count++
    console.log("count is:", count)
    console.log("id is:", id)
    const result = await getCustomerFromAuthorize(id);
    // console.log("result:", result)

    let transactionHistory, customerSubscription;
    // console.log("result?.data?.profile?.customerProfileId:", result?.data?.profile?.customerProfileId)
    if (result?.data?.profile?.customerProfileId) {
        transactionHistory = await getTransactionHistory(result);
        // console.log("transactionHistory:", transactionHistory)
    }

    if (result?.data?.subscriptionIds) {
        customerSubscription = await getCustomerSubscriptionFromAuthorize(result.data.subscriptionIds[0]);
        // console.log("customerSubscription:", customerSubscription)
        // await storeInFile(customerSubscription)
    }

    finalArray.push({
        result: result?.data,
        transactionHistory,
        customerSubscription,
    });
}

await storeInFile(finalArray)



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
async function authorizePaymentAuthentication() {
    // Set up the merchant authentication
    const apiLoginId = '7F57wRjv';
    const transactionKey = '7k884WqLj96E36jy'

    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(apiLoginId);
    merchantAuthenticationType.setTransactionKey(transactionKey);

    return merchantAuthenticationType
}
async function storeInFile(data) {
    // Define the file path relative to the project root
    try {
        const filePath = path.join(process.cwd(), 'data', 'AuthorizeData', '19thApril2026.json');

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

            jsonData.push(data);

            await fs.writeFile(filePath, JSON.stringify(data, null, 2));
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


//read from csv sheet - sheet4
//If the row has Authorize_PaymentStatus
