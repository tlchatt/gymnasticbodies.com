import { NextResponse } from 'next/server';
import { authorizePaymentAuthentication, createAuthorizeTransaction, createCustomerInAuthorize, createSubscriptionInAuthorize, getAllDataFromFile, getCustomerFromAuthorize } from '@/lib/commonServerFunction';
import { getFlagAndSubscriptionInfo } from '@/lib/commonFunctions';
import { createAccountForUser, createAndModifyUserInNeon, getUserWithEmail, insertIntoUserSetting, queryUserSetting, updateUserSetting } from '@/lib/userSettings';
import { ConnectingAirportsOutlined } from '@mui/icons-material';

let testUrl = process.env.NEXT_PUBLIC_API_URL


export async function POST(request) {
    // const data = await request.text();
    const params = await request.formData()
    let reason = params.get('reason')
    console.log("params:", params, "\nreason:", reason)

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
        password: params.get('userPassword'),
        postAWS: params.get('postAWS'),
        trial: params.get('trial')
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
    let customerSubscriptionStatus, authorizationTransactionIs, authorizeCustomerIs, subscriptionForCustomer, userInNeon, impInfo, customerData, customerSubscription, customerInfoFromAuthorize

    if (reason == "createSubscription") {//review again, might error
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

        customerData = await getAllDataFromFile(incomingData.email)

        // customerData = allAuthorizeData.find(data => data.result.profile.email === incomingData.email);
        console.log("customerData from allAuthorizeData:", customerData)

        customerSubscription = customerData?.customerSubscription

        if (customerSubscription) {
            customerSubscriptionStatus = customerData?.customerSubscription?.data?.subscription?.status
        }
        if (customerSubscriptionStatus != "active") {//previous status of last subscription
            console.log("inside customerSubscriptionStatus != active")
            
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
                        return NextResponse.json({
                            message: 'Transaction successful, customer created, subscription created',
                            data: {
                                email: incomingData.email,
                                transaction: true,
                                transactionId: authorizationTransactionIs?.data?.transactionResponse?.transId,
                                customerId: authorizeCustomerIs,
                                subscriptionId: subscriptionForCustomer,
                                customerCreated: true,
                                subscriptionCreated: true,
                                userInNeon: userInNeon,
                                token: userInNeon?.data?.data?.token,
                                impInfo: impInfo,
                                firstName: billTo?.firstName ?? "N/A"
                            }
                        }, { status: 200 });
                    } else {

                        return NextResponse.json({
                            transaction: true,
                            transactionId: authorizationTransactionIs?.data?.transactionResponse?.transId,
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
                        transactionId: authorizationTransactionIs?.data?.transactionResponse?.transId,
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
            impInfo = await getFlagAndSubscriptionInfo(customerData, authorizeCustomerIs, incomingData)
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





