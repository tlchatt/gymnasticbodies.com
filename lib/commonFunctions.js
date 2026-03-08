
import { ConnectingAirportsOutlined } from '@mui/icons-material';
import moment from 'moment-timezone'

export async function storeInLocalStorage(response) {
    console.log("response in storeInLocalStorage:", JSON.stringify(response))
    const today = new Date();
    const expirationDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const refreshExpireTime = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    let postAWS = response?.data?.impInfo?.AuthorizeNextImport
    const timezone = moment.tz.guess();

    let user = {
        ...response.data?.data?.userInNeon?.user,
        token: response.data?.data?.userInNeon?.token,
        refreshToken: response.data?.data?.userInNeon?.token,
        expirationDate: expirationDate,
        refreshExpireTime: refreshExpireTime,
        timezone: timezone,
        postAWS: postAWS
    }
    console.log("JSON.stringify(user):", JSON.stringify(user))
    localStorage.setItem('user', JSON.stringify(user));

    return user
}
export async function getFlagAndSubscriptionInfo(customerData, authorizeCustomerIs, incomingData) {
    console.log("customerData inside getFlagAndSubscriptionInfo:", customerData)
    let envoronment = process.env.NEXT_PUBLIC_ENVIRONMENT
    console.log("envoronment:", envoronment)
    let testPrices = []
    if (envoronment == 'development') {
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

    let price, oldestTransactionDate, recentTransactionDate, nextPaymentDate, status, profile, paymentProfile, shippingProfile, subscriptionProfile, hasSubscription
    profile = customerData.result.profile
    paymentProfile = profile?.paymentProfiles?.[0]
    shippingProfile = profile?.shipToList
    subscriptionProfile = customerData?.customerSubscription?.data?.subscription
    hasSubscription = customerData.result?.subscriptionIds ? true : false

    let todaysDate = new Date();
    // let todaysIsoDate = todaysDate.toISOString()

    let merchantid = customerData?.result?.profile?.merchantCustomerId ?? null //for new users and old users with no transactions no merchant id
    let AuthorizeNextImport = merchantid ? true : false
    let transactions = customerData?.transactionHistory?.data?.transactions ?? null
    let subscription = customerData?.customerSubscription?.data?.subscription ?? null
    if (incomingData?.amount) {//user making a payment for a subscription
        price = incomingData.amount.toString()
        recentTransactionDate = todaysDate
    } else {
        if (subscription) {
            console.log("subscription:", subscription)
            price = subscription.amount.toString()
            recentTransactionDate = new Date(subscription.paymentSchedule.startDate)
            // nextPaymentDate = new Date(subscription.paymentSchedule.startDate) ?? null
        }
        if (transactions) {
            console.log("transactions:", transactions)
            let recentTransaction = transactions[0] // most recent transaction
            let oldestTransaction = transactions[transactions.length - 1] //oldest transaction
            oldestTransactionDate = new Date(oldestTransaction?.submitTimeLocal)
            recentTransactionDate = new Date(recentTransaction?.submitTimeLocal)
            price = recentTransaction?.settleAmount.toString()
        }
    }

    let matchedTerm = price ? priceMap.find(item => item.price === price)?.term : null;
    let authorizenetCustomerId = customerData?.result?.profile?.customerProfileId ? customerData?.result?.profile?.customerProfileId : authorizeCustomerIs?.data?.customerProfileId

    console.log("subscription:", subscription)
    console.log("matchedTerm:", matchedTerm)
    console.log("recentTransactionDate:", recentTransactionDate)

    if (subscription) {
        if (matchedTerm) {
            if (matchedTerm == "monthly") {
                recentTransactionDate = new Date(nextPaymentDate);
                recentTransactionDate.setMonth(nextPaymentDate.getMonth() - 1);
            } else if (matchedTerm == "quarterly") {
                recentTransactionDate = new Date(nextPaymentDate);
                recentTransactionDate.setMonth(nextPaymentDate.getMonth() - 3);
            } else if (matchedTerm == "annually") {
                recentTransactionDate = new Date(nextPaymentDate);
                recentTransactionDate.setMonth(nextPaymentDate.getFullYear() - 1);
            } else {
                //return new amount found, contact admin
            }
        }
    } else {
        if (matchedTerm) {
            if (matchedTerm == "monthly") {
                nextPaymentDate = new Date(recentTransactionDate);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            } else if (matchedTerm == "quarterly") {
                nextPaymentDate = new Date(recentTransactionDate);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 3);
            } else if (matchedTerm == "annually") {
                nextPaymentDate = new Date(recentTransactionDate);
                nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            } else {
                //return new amount found, contact admin
            }
        }
    }
    console.log("nextPaymentDate:", nextPaymentDate)
    console.log("todaysDate:", todaysDate)
    console.log("nextPaymentDate < todaysDate:", nextPaymentDate < todaysDate)
    if (nextPaymentDate < todaysDate) {
        //don't create a subscription
        status = "inactive"
    } else {
        //create a subscription
        status = "active"
    }

    console.log("retuned data from getFlagAndSubscriptionInfo", {
        merchantid: merchantid ?? "N/A",
        authorizenetCustomerId: authorizenetCustomerId ?? "N/A",
        customerAddressId: shippingProfile?.[0]?.customerAddressId ?? "N/A",
        customerPaymentProfileId: paymentProfile?.customerPaymentProfileId ?? "N/A",
        AuthorizeNextImport: AuthorizeNextImport ?? "N/A",
        status: status ?? "N/A",

        oldestTransactionDate: oldestTransactionDate,
        recentTransactionDate: recentTransactionDate,
        nextPaymentDate: nextPaymentDate,
        todaysDate: todaysDate,

        redableOldestTransactionDate: await getDateString(oldestTransactionDate),
        redableRecentTransactionDate: await getDateString(recentTransactionDate),
        redableNextPaymentDate: await getDateString(nextPaymentDate),
        redableTodaysDate: await getDateString(todaysDate),

        price: price ?? "N/A",
        matchedTerm: matchedTerm ?? "N/A",

        firstName: paymentProfile?.billTo?.firstName ?? "N/A",
        lastName: paymentProfile?.billTo?.lastName ?? "N/A",
        phoneNumber: paymentProfile?.billTo?.phoneNumber ?? "N/A",
        country: paymentProfile?.billTo?.country ?? "N/A",
        email: profile?.email ?? "N/A",
        subscriptionName: subscriptionProfile?.name ?? "N/A",
        hasSubscription: hasSubscription
    })
    return (
        {
            merchantid: merchantid ?? "N/A",
            authorizenetCustomerId: authorizenetCustomerId ?? "N/A",
            customerAddressId: shippingProfile?.[0]?.customerAddressId ?? "N/A",
            customerPaymentProfileId: paymentProfile?.customerPaymentProfileId ?? "N/A",
            AuthorizeNextImport: AuthorizeNextImport ?? "N/A",
            status: status ?? "N/A",

            oldestTransactionDate: oldestTransactionDate,
            recentTransactionDate: recentTransactionDate,
            nextPaymentDate: nextPaymentDate,
            todaysDate: todaysDate,

            redableOldestTransactionDate: await getDateString(oldestTransactionDate),
            redableRecentTransactionDate: await getDateString(recentTransactionDate),
            redableNextPaymentDate: await getDateString(nextPaymentDate),
            redableTodaysDate: await getDateString(todaysDate),

            price: price ?? "N/A",
            matchedTerm: matchedTerm ?? "N/A",

            firstName: paymentProfile?.billTo?.firstName ?? "N/A",
            lastName: paymentProfile?.billTo?.lastName ?? "N/A",
            phoneNumber: paymentProfile?.billTo?.phoneNumber ?? "N/A",
            country: paymentProfile?.billTo?.country ?? "N/A",
            email: profile?.email ?? "N/A",
            subscriptionName: subscriptionProfile?.name ?? "N/A",
            hasSubscription: hasSubscription

        }
    )

}
export async function getDateString(date) {
    // console.log("data in getDateString:", date)

    let readableDate = date?.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }) ?? "N/A"
    // console.log("readableDate:", readableDate)
    return readableDate
}
