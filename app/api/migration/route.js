import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user, user_setting } from "@/Drizzle/db/schema"
import path from 'path';
import { eq, sql } from 'drizzle-orm';
import fsp from 'fs/promises' // not 'fs'
import fs from 'fs'

import { getDateString } from "@/lib/commonFunctions";
import { getUserWithEmail, insertIntoUserSetting, queryUserSetting } from "@/lib/userSettings";
import csv from 'csv-parser';
import { writeQueue } from "@/lib/writeFile";
import { convertProcessSignalToExitCode } from "util";

export async function POST(request) {

    // let csvData = await getCSVData()
    // await storeInFile(csvData)

    const data = await request.json()
    let email = data?.email
    let first_name = data?.first_name
    let last_name = data?.last_name
    let payment_method = data?.payment_method
    let transactionDate = data?.transactionDate
    let cost = data?.cost
    let transactionStatus = data?.transactionStatus
    let productName = data?.productName
    let invoiceNo = data?.invoiceNo
    let date_registered = data?.date_registered
    console.log("...........................................", email)

    try {
        // let result = await migration(email, first_name, last_name)
        let result = await migrationOtherSources(email, first_name, last_name, payment_method, transactionDate, cost, transactionStatus, productName, invoiceNo,date_registered)

        return new Response(JSON.stringify({ message: 'OK' }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error(error);
        return new Response('Error processing request', { status: 200 });//so that webhook doesn't deactivate in wordpress
    }
}
// GET just to return 200 status for preflight to work
export async function GET() {
    // console.log("user_setting:",user_setting)
    // let queryExisting = await db.select().from(user_setting).where(eq(user_setting.userId));
    // console.log("queryExisting in GET:",queryExisting)
    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
export async function migration(email, first_name, last_name) {
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

    customerData = await getAllDataFromFile(email)//customerData is AuthorizeCustomerData

    customerSubscription = customerData?.customerSubscription
    customerTransaction = customerData?.transactionHistory
    customerProfile = customerData?.result?.profile

    // console.log("customerData from allAuthorizeData:", customerData)
    // console.log("customerTransaction from allAuthorizeData:", customerTransaction)

    if (customerProfile) {//customer already present in Authorize json exported data
        impInfo = await getFlagAndSubscriptionInfo(customerData, email, first_name, last_name)
        console.log("impInfo in if customerProfile:", impInfo)
        //return message "Already have a Subscription"

        userInNeon = await createAndModifyUserInNeon(impInfo, email, first_name, last_name)

        return userInNeon
    } else {
        console.log("customer not in authorize profile")

        return false
    }

}
export async function migrationOtherSources(email, first_name, last_name, payment_method, transactionDate, cost, transactionStatus, productName, invoiceNo,date_registered) {

    let customerSubscriptionStatus, authorizationTransactionIs, authorizeCustomerIs, subscriptionForCustomer, userInNeon, impInfo, customerData, customerSubscription, customerTransaction, customerProfile, customerInfoFromAuthorize

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

    // customerData = await getAllDataFromFile(email)//customerData is AuthorizeCustomerData

    // customerSubscription = customerData?.customerSubscription
    // customerTransaction = customerData?.transactionHistory
    // customerProfile = customerData?.result?.profile

    // // console.log("customerData from allAuthorizeData:", customerData)
    // // console.log("customerTransaction from allAuthorizeData:", customerTransaction)

    // if (customerProfile) {//customer already present in Authorize json exported data
    impInfo = await getFlagAndSubscriptionInfoForOtherUsers(email, first_name, last_name, payment_method, transactionDate, cost, transactionStatus, productName, invoiceNo,date_registered)
    console.log("impInfo in if customerProfile:", impInfo)
    //return message "Already have a Subscription"

    userInNeon = await createAndModifyUserInNeon(impInfo, email, first_name, last_name)

    return userInNeon
    // } else {
    //     console.log("customer not in authorize profile")

    //     return false
    // }

}
export async function getAllDataFromFile(email) {
    // console.log("email inside getAllDataFromFile:", email)
    // console.log("process.cwd():", process.cwd())
    const filePath = path.join(process.cwd(), 'data', 'AuthorizeData', '19thApril2026.json');
    const fileContents = await fsp.readFile(filePath, 'utf8');
    const allAuthorizeData = JSON.parse(fileContents);
    // console.log("allAuthorizeData length:", allAuthorizeData.length)
    let customerData = allAuthorizeData.find(data => data.result.profile.email === email);
    // console.log("customerData:", customerData)
    return customerData
}
export async function getFlagAndSubscriptionInfo(customerData, email, first_name, last_name) {
    // console.log("customerData inside getFlagAndSubscriptionInfo:", customerData)
    let environment = process.env.NEXT_PUBLIC_ENVIRONMENT
    // console.log("environment:", environment)
    let testPrices = []
    if (environment == 'development') {
        testPrices = [{
            price: "0.02",
            term: "monthly"
        },
        {
            price: "0.01",
            term: "annually"
        }]
    }

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

    priceMap.push(...testPrices)

    let price, oldestTransactionDate, recentTransactionDate, nextPaymentDate, status, profile, paymentProfile, shippingProfile, subscriptionProfile, hasSubscription, hasTrial
    profile = customerData?.result?.profile
    paymentProfile = profile?.paymentProfiles?.[0]
    shippingProfile = profile?.shipToList
    subscriptionProfile = customerData?.customerSubscription?.data?.subscription
    hasSubscription = customerData?.result?.subscriptionIds ? true : false

    let todaysDate = new Date();
    // let todaysIsoDate = todaysDate.toISOString()

    let merchantid = customerData?.result?.profile?.merchantCustomerId ?? null //for new users and old users with no transactions no merchant id
    let AuthorizeNextImport = merchantid ? true : false //for new customer this is false
    let postAWS = merchantid ? false : true //for new customer this is true
    let transactions = customerData?.transactionHistory?.data?.transactions ?? null
    if (transactions) {//rearrange transactions to be in the order latest to oldest.
        transactions = transactions.sort((a, b) => new Date(b.submitTimeLocal) - new Date(a.submitTimeLocal));
    }
    let subscription = customerData?.customerSubscription?.data?.subscription ?? null

    if (subscription) {
        // console.log("subscription:", subscription)
        price = subscription.amount.toString()
        // recentTransactionDate = new Date(subscription?.paymentSchedule?.startDate)
        if (new Date(subscription?.paymentSchedule?.startDate) > todaysDate) {
            nextPaymentDate = new Date(subscription?.paymentSchedule?.startDate)
        }
        // nextPaymentDate = new Date(subscription.paymentSchedule.startDate) ?? null
    }
    if (transactions) {
        // console.log("transactions:", transactions)
        let recentTransaction = transactions[0] // most recent transaction
        let oldestTransaction = transactions[transactions?.length - 1] //oldest transaction
        oldestTransactionDate = new Date(oldestTransaction?.submitTimeLocal)
        recentTransactionDate = new Date(recentTransaction?.submitTimeLocal)
        price = recentTransaction?.settleAmount.toString()
    }

    let matchedTerm = price ? priceMap.find(item => item.price === price)?.term : null;
    let authorizenetCustomerId = customerData?.result?.profile?.customerProfileId ?? null

    // console.log("subscription:", subscription)
    // console.log("matchedTerm:", matchedTerm)
    // console.log("price:", price)
    // console.log("authorizenetCustomerId:", authorizenetCustomerId)
    // console.log("oldestTransactionDate:", oldestTransactionDate)
    // console.log("recentTransactionDate:", recentTransactionDate)
    // console.log("nextPaymentDate:", nextPaymentDate)

    if (matchedTerm && recentTransactionDate) {
        const baseDate = new Date(recentTransactionDate)

        if (matchedTerm === "monthly") {
            nextPaymentDate = new Date(baseDate)
            nextPaymentDate.setMonth(baseDate.getMonth() + 1)
        } else if (matchedTerm === "quarterly") {
            nextPaymentDate = new Date(baseDate)
            nextPaymentDate.setMonth(baseDate.getMonth() + 3)
        } else if (matchedTerm === "annually") {
            nextPaymentDate = new Date(baseDate)
            nextPaymentDate.setFullYear(baseDate.getFullYear() + 1)
        } else {
            // unknown term
            console.error("Unknown matchedTerm:", matchedTerm)
        }
        // Fix month-end rollover: if day changed, set to last day of target month
        if (nextPaymentDate.getDate() !== baseDate.getDate()) {
            nextPaymentDate.setDate(0) // 0 = last day of previous month
        }
    }

    if (!nextPaymentDate || nextPaymentDate < todaysDate) {
        //don't create a subscription
        status = "Inactive"
    } else {
        //create a subscription
        // console.log("subscription inside:", subscription)
        if (subscription?.status == "canceled") {
            status = "Inactive"
            nextPaymentDate = undefined
        } else {
            status = "Active"
        }

    }

    // console.log("nextPaymentDate:", nextPaymentDate)
    // console.log("todaysDate:", todaysDate)
    // console.log("nextPaymentDate < todaysDate:", nextPaymentDate < todaysDate)

    //get trial info that is stored in the db
    let dbUser = await getUserWithEmail(email)
    // console.log("dbUser in getFlagAndSubscriptionInfo:", dbUser)
    let isExistingUser = dbUser?.id ? true : false
    let userSetting, subscriptionId = null
    if (isExistingUser) {
        userSetting = await queryUserSetting(dbUser?.id, 'subscription')
        console.log("matching user setting in getFlagAndSubscriptionInfo:", userSetting)
        if (userSetting) {
            subscriptionId = JSON.parse(userSetting?.data)?.authorizeSubscription
            // console.log("subscriptionId:", subscriptionId)
        }
    } else {
        console.log("No existing user found in DB for email:", email)
        //create user

    }

    // console.log("retuned data from getFlagAndSubscriptionInfo", {
    //     merchantid: merchantid ?? "N/A",
    //     id: dbUser?.id ?? "N/A",
    //     authorizenetCustomerId: authorizenetCustomerId ?? "N/A",
    //     subscriptionId: subscriptionId,
    //     customerAddressId: shippingProfile?.[0]?.customerAddressId ?? "N/A",
    //     customerPaymentProfileId: paymentProfile?.customerPaymentProfileId ?? "N/A",
    //     AuthorizeNextImport: AuthorizeNextImport ?? "N/A",
    //     status: status ?? "N/A",
    //     postAWS: postAWS ?? "N/A",
    //     oldestTransactionDate: oldestTransactionDate,
    //     recentTransactionDate: recentTransactionDate,
    //     nextPaymentDate: nextPaymentDate,
    //     todaysDate: todaysDate,

    //     redableOldestTransactionDate: await getDateString(oldestTransactionDate),
    //     redableRecentTransactionDate: await getDateString(recentTransactionDate),
    //     redableNextPaymentDate: await getDateString(nextPaymentDate),
    //     redableTodaysDate: await getDateString(todaysDate),

    //     trial: false,
    //     trialStartDate: await getDateString(userSetting?.trialStartDate) ?? "N/A",
    //     trialEndDate: await getDateString(userSetting?.trialEndDate) ?? "N/A",



    //     price: price ?? "N/A",
    //     matchedTerm: matchedTerm ?? "N/A",

    //     firstName: paymentProfile?.billTo?.firstName ?? "N/A",
    //     lastName: paymentProfile?.billTo?.lastName ?? "N/A",
    //     phoneNumber: paymentProfile?.billTo?.phoneNumber ?? "N/A",
    //     country: paymentProfile?.billTo?.country ?? "N/A",
    //     email: email ?? "N/A",
    //     subscriptionName: subscriptionProfile?.name ?? "N/A",
    //     hasSubscription: hasSubscription
    // })
    return (
        {
            merchantid: merchantid ?? "N/A",
            id: dbUser?.id ?? "N/A",
            authorizenetCustomerId: authorizenetCustomerId ?? "N/A",
            subscriptionId: subscriptionId,
            customerAddressId: shippingProfile?.[0]?.customerAddressId ?? "N/A",
            customerPaymentProfileId: paymentProfile?.customerPaymentProfileId ?? "N/A",
            AuthorizeNextImport: AuthorizeNextImport ?? "N/A",
            status: status ?? "N/A",
            postAWS: postAWS ?? "N/A",

            oldestTransactionDate: oldestTransactionDate,
            recentTransactionDate: recentTransactionDate,
            nextPaymentDate: nextPaymentDate,
            todaysDate: todaysDate,

            redableOldestTransactionDate: await getDateString(oldestTransactionDate),
            redableRecentTransactionDate: await getDateString(recentTransactionDate),
            redableNextPaymentDate: await getDateString(nextPaymentDate),
            redableTodaysDate: await getDateString(todaysDate),

            trial: false,
            trialStartDate: await getDateString(userSetting?.trialStartDate) ?? "N/A",
            trialEndDate: await getDateString(userSetting?.trialEndDate) ?? "N/A",

            price: price ?? "N/A",
            matchedTerm: matchedTerm ?? "N/A",

            firstName: first_name ?? "N/A",
            lastName: last_name ?? "N/A",
            phoneNumber: paymentProfile?.billTo?.phoneNumber ?? "N/A",
            country: paymentProfile?.billTo?.country ?? "N/A",
            email: email ?? "N/A",
            subscriptionName: subscriptionProfile?.name ?? "N/A",
            hasSubscription: hasSubscription,
        }
    )

}
export async function getFlagAndSubscriptionInfoForOtherUsers(email, first_name, last_name, payment_method, transactionDate, cost, transactionStatus, productName, invoiceNo, date_registered) {
    // console.log("customerData inside getFlagAndSubscriptionInfo:", customerData)
    let environment = process.env.NEXT_PUBLIC_ENVIRONMENT
    // console.log("environment:", environment)
    let testPrices = []
    if (environment == 'development') {
        testPrices = [{
            price: "0.02",
            term: "monthly"
        },
        {
            price: "0.01",
            term: "annually"
        }]
    }
    //oneTime is Bundles & Courses
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
        },
        {
            price: "99.99",
            term: "oneTime"
        },
        {
            price: "80",
            term: "oneTime"
        },
        {
            price: "85",
            term: "oneTime"
        },
        {
            price: "799",
            term: "oneTime"
        },
        {
            price: "275",
            term: "oneTime"
        },
        {
            price: "149.89",
            term: "annually"
        },
        {
            price: "240",
            term: "oneTime"
        },
        {
            price: "195",
            term: "oneTime"
        },
        {
            price: "200.01",
            term: "oneTime"
        },
        {
            price: "395",
            term: "oneTime"
        },
        {
            price: "170",
            term: "oneTime"
        },
        {
            price: "375",
            term: "oneTime"
        },
        {
            price: "149.88",
            term: "annually"
        },
        {
            price: "149.99",
            term: "annually"
        },
        {
            price: "164.89",
            term: "annually"
        },
        {
            price: "154.88",
            term: "annually"
        },
        {
            price: "214.88",
            term: "annually"
        },
        {
            price: "129.88",
            term: "annually"
        },
        {
            price: "154.89",
            term: "annually"
        }
    ]

    priceMap.push(...testPrices)

    let price, oldestTransactionDate, recentTransactionDate, nextPaymentDate, status, profile, paymentProfile, shippingProfile, subscriptionProfile, hasSubscription, hasTrial
    // profile = customerData?.result?.profile
    // paymentProfile = profile?.paymentProfiles?.[0]
    // shippingProfile = profile?.shipToList
    // subscriptionProfile = customerData?.customerSubscription?.data?.subscription
    // hasSubscription = customerData?.result?.subscriptionIds ? true : false

    let todaysDate = new Date();
    // let todaysIsoDate = todaysDate.toISOString()

    let merchantid = invoiceNo ?? null //for new users and old users with no transactions no merchant id
    let AuthorizeNextImport = merchantid ? true : false //for new customer this is false
    let postAWS = merchantid ? false : true //for new customer this is true
    // let transactions = customerData?.transactionHistory?.data?.transactions ?? null
    // if (transactions) {//rearrange transactions to be in the order latest to oldest.
    //     transactions = transactions.sort((a, b) => new Date(b.submitTimeLocal) - new Date(a.submitTimeLocal));
    // }
    // let subscription = customerData?.customerSubscription?.data?.subscription ?? null

    // if (subscription) {
    //     // console.log("subscription:", subscription)
    //     price = subscription.amount.toString()
    //     // recentTransactionDate = new Date(subscription?.paymentSchedule?.startDate)
    //     if (new Date(subscription?.paymentSchedule?.startDate) > todaysDate) {
    //         nextPaymentDate = new Date(subscription?.paymentSchedule?.startDate)
    //     }
    //     // nextPaymentDate = new Date(subscription.paymentSchedule.startDate) ?? null
    // }
    if (transactionDate) {
        // console.log("transactions:", transactions)
        // let recentTransaction = transactions[0] // most recent transaction
        // let oldestTransaction = transactions[transactions?.length - 1] //oldest transaction
        // oldestTransactionDate = new Date(oldestTransaction?.submitTimeLocal)
        recentTransactionDate = new Date(transactionDate)
        price = cost.toString()
    } else {
        console.error("No transaction date provided for email:", email)
    }

    let matchedTerm = price ? priceMap.find(item => item.price === price)?.term : null;
    console.log("matchedTerm:", matchedTerm)
    // let authorizenetCustomerId = customerData?.result?.profile?.customerProfileId ?? null

    // console.log("subscription:", subscription)
    // console.log("matchedTerm:", matchedTerm)
    // console.log("price:", price)
    // console.log("authorizenetCustomerId:", authorizenetCustomerId)
    // console.log("oldestTransactionDate:", oldestTransactionDate)
    // console.log("recentTransactionDate:", recentTransactionDate)
    console.log("recentTransactionDate first:", recentTransactionDate)
    console.log("matchedTerm:", matchedTerm)
    if (matchedTerm && recentTransactionDate) {
        const baseDate = new Date(recentTransactionDate);
        console.log("baseDate:", baseDate);

        if (matchedTerm === "monthly") {
            nextPaymentDate = new Date(baseDate);
            nextPaymentDate.setMonth(baseDate.getMonth() + 1);
        } else if (matchedTerm === "quarterly") {
            nextPaymentDate = new Date(baseDate);
            nextPaymentDate.setMonth(baseDate.getMonth() + 3);
        } else if (matchedTerm === "annually") {
            nextPaymentDate = new Date(baseDate);
            nextPaymentDate.setFullYear(baseDate.getFullYear() + 1);
            console.log("nextPaymentDate ??:", nextPaymentDate)
        } else {
            // unknown term or oneTime term
            console.error("Unknown matchedTerm:", matchedTerm);
            nextPaymentDate = undefined;
        }
        // Only run month-end fix if we actually have a date
        if (nextPaymentDate && nextPaymentDate.getDate() !== baseDate.getDate()) {
            console.log("5")
            nextPaymentDate.setDate(0); // 0 = last day of previous month
        }
    }
    let purchase = false
    if (matchedTerm === "oneTime") {
        status = "Active"
        purchase = true
        nextPaymentDate = undefined //forever active - one time purchase doesn't have a next payment date
    } else {
        if (!nextPaymentDate || nextPaymentDate < todaysDate) {
            //don't create a subscription
            status = "Inactive"
        } else {
            //create a subscription
            // console.log("subscription inside:", subscription)
            if (transactionStatus == "wc-failed" || transactionStatus == "wc-cancelled" || transactionStatus == "wc-refunded" || transactionStatus == "wc-pending" || transactionStatus == "wc-on-hold") {
                status = "Inactive"
                nextPaymentDate = undefined
            } else {
                status = "Active"
            }

        }
    }


    // console.log("nextPaymentDate:", nextPaymentDate)
    // console.log("todaysDate:", todaysDate)
    // console.log("nextPaymentDate < todaysDate:", nextPaymentDate < todaysDate)

    //get trial info that is stored in the db
    let dbUser = await getUserWithEmail(email)
    // console.log("dbUser in getFlagAndSubscriptionInfo:", dbUser)
    let isExistingUser = dbUser?.id ? true : false
    let userSetting, subscriptionId = null
    if (isExistingUser) {
        userSetting = await queryUserSetting(dbUser?.id, 'subscription')
        console.log("matching user setting in getFlagAndSubscriptionInfo:", userSetting)
        if (userSetting) {
            subscriptionId = JSON.parse(userSetting?.data)?.authorizeSubscription
            // console.log("subscriptionId:", subscriptionId)
        }
    } else {
        console.log("No existing user found in DB for email:", email)
        //create user

    }

    // console.log("retuned data from getFlagAndSubscriptionInfo", {
    //     payment_method: payment_method,
    //     productName: productName,
    //     merchantid: merchantid ?? "N/A",
    //     id: dbUser?.id ?? "N/A",
    //     authorizenetCustomerId: authorizenetCustomerId ?? "N/A",
    //     subscriptionId: subscriptionId,
    //     customerAddressId: shippingProfile?.[0]?.customerAddressId ?? "N/A",
    //     customerPaymentProfileId: paymentProfile?.customerPaymentProfileId ?? "N/A",
    //     AuthorizeNextImport: AuthorizeNextImport ?? "N/A",
    //     status: status ?? "N/A",
    //     postAWS: postAWS ?? "N/A",

    //     oldestTransactionDate: oldestTransactionDate,
    //     recentTransactionDate: recentTransactionDate,
    //     nextPaymentDate: nextPaymentDate,
    //     todaysDate: todaysDate,

    //     redableOldestTransactionDate: await getDateString(oldestTransactionDate),
    //     redableRecentTransactionDate: await getDateString(recentTransactionDate),
    //     redableNextPaymentDate: await getDateString(nextPaymentDate),
    //     redableTodaysDate: await getDateString(todaysDate),

    //     trial: false,
    //     trialStartDate: await getDateString(userSetting?.trialStartDate) ?? "N/A",
    //     trialEndDate: await getDateString(userSetting?.trialEndDate) ?? "N/A",

    //     price: price ?? "N/A",
    //     matchedTerm: matchedTerm ?? "N/A",

    //     firstName: first_name ?? "N/A",
    //     lastName: last_name ?? "N/A",
    //     phoneNumber: paymentProfile?.billTo?.phoneNumber ?? "N/A",
    //     country: paymentProfile?.billTo?.country ?? "N/A",
    //     email: email ?? "N/A",
    //     subscriptionName: subscriptionProfile?.name ?? "N/A",
    //     hasSubscription: hasSubscription,
    // })
    return (
        {
            payment_method: payment_method,
            productName: productName,
            purchase: purchase,
            previousTransactionStatus: transactionStatus,
            merchantid: merchantid ?? "N/A",
            id: dbUser?.id ?? "N/A",
            authorizenetCustomerId: "N/A",
            subscriptionId: subscriptionId,
            customerAddressId: shippingProfile?.[0]?.customerAddressId ?? "N/A",
            customerPaymentProfileId: paymentProfile?.customerPaymentProfileId ?? "N/A",
            AuthorizeNextImport: AuthorizeNextImport ?? "N/A",
            status: status ?? "N/A",
            postAWS: postAWS ?? "N/A",

            oldestTransactionDate: date_registered,
            recentTransactionDate: recentTransactionDate,
            nextPaymentDate: nextPaymentDate,
            todaysDate: todaysDate,

            redableOldestTransactionDate: await getDateString(date_registered),
            redableRecentTransactionDate: await getDateString(recentTransactionDate),
            redableNextPaymentDate: await getDateString(nextPaymentDate),
            redableTodaysDate: await getDateString(todaysDate),

            trial: false,
            trialStartDate: await getDateString(userSetting?.trialStartDate) ?? "N/A",
            trialEndDate: await getDateString(userSetting?.trialEndDate) ?? "N/A",

            price: price ?? "N/A",
            matchedTerm: matchedTerm ?? "N/A",

            firstName: first_name ?? "N/A",
            lastName: last_name ?? "N/A",
            phoneNumber: paymentProfile?.billTo?.phoneNumber ?? "N/A",
            country: paymentProfile?.billTo?.country ?? "N/A",
            email: email ?? "N/A",
            subscriptionName: subscriptionProfile?.name ?? "N/A",
            hasSubscription: hasSubscription,
        }
    )

}
export async function createAndModifyUserInNeon(impInfo, email, first_name, last_name) {
    let settingsRecord = {
        type: impInfo?.purchase ? 'purchase' : 'subscription',
        status: impInfo?.status,
        postAWS: impInfo?.postAWS,
        data: {
            purchase: impInfo?.purchase,
            status: impInfo?.status,
            payment_method: impInfo?.payment_method ?? "N/A",
            productName: impInfo?.productName ?? "N/A",
            previousTransactionStatus: impInfo?.previousTransactionStatus ?? "N/A",
            renewaldate: impInfo?.nextPaymentDate ?? "N/A",
            startdate: impInfo?.oldestTransactionDate ?? "N/A",
            price: impInfo?.price ?? "N/A",
            phone: impInfo?.phone ?? "N/A",
            country: impInfo?.country ?? "N/A",
            email: email ?? "N/A",
            term: impInfo?.matchedTerm ?? "N/A",
            first_name: impInfo?.firstName ?? "N/A",
            last_name: impInfo?.lastName ?? "N/A",
            // authorizeCustomer: subscriptionForCustomer?.data["profile"] ?? "N/A",
            // authorizeSubscription: subscriptionForCustomer?.data["subscriptionId"] ?? "N/A",
        },
        // userId: dbUser.user.id,
        woocommerceAuthorizeImport: false,
        authorizeNextImport: impInfo?.AuthorizeNextImport,
        authorizeCustomerId: impInfo?.authorizenetCustomerId,
        woocommerceSource: impInfo?.payment_method,
        trial: false,
        // trialStartDate: new Date(),
        // trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }
    let dbUser = await getUserWithEmail(email)
    // console.log("dbUser before:", dbUser)
    let isExistingUser = dbUser?.id ? true : false
    // console.log("isExistingUser:", isExistingUser)
    if (!isExistingUser) {
        // dbUser = await createAccountForUser(finalData)
        dbUser = await createUser(impInfo, first_name, last_name)
    }
    // console.log("dbUser:", dbUser)
    settingsRecord.userId = dbUser?.user?.id ?? dbUser?.id
    // console.log("settingsRecord:", settingsRecord)
    let matching = await queryUserSetting(settingsRecord?.userId, settingsRecord?.type)
    // console.log("matching:", matching)
    let userSetting
    if (matching) {
        userSetting = await updateUserSetting(matching, settingsRecord)
    } else {
        userSetting = await insertIntoUserSetting(settingsRecord)
    }
    // console.log("userSetting:", userSetting)
    return dbUser
}
export async function updateUserSetting(matching, settingsRecord) {
    // console.log("inside updateUserSetting:")
    let userSetting = await db.update(user_setting)
        .set({
            type: settingsRecord?.type,
            data: settingsRecord.data,
            status: settingsRecord.status,
            woocommerceAuthorizeImport: false
        }).where(eq(user_setting.id, matching.id)).returning();

    return userSetting
}
export async function createUser(settingsRecord, first_name, last_name) {
    // console.log("settingsRecord:",settingsRecord)
    let userField = await db.insert(user)
        .values({
            id: sql`gen_random_uuid()`,
            name: first_name + " " + last_name,
            email: settingsRecord.email,
        })
        .returning();

    return userField[0]
}
export async function getCSVData() {
    const results = [];
    //   console.log("process.cwd():",process.cwd())
    const filePath = path.join(process.cwd(), 'data/Migration/userData.csv');

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}
async function storeInFile(data) {
    // Define the file path relative to the project root
    try {
        const filePath = path.join(process.cwd(), 'data', 'Migration', 'userData.json');

        // Read the existing data from the file
        let fileData;
        // This will wait for any previous writes to finish before starting
        await writeQueue.add(async () => {
            try {
                fileData = await fsp.readFile(filePath, 'utf8');
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

            await fsp.writeFile(filePath, JSON.stringify(data, null, 2));
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