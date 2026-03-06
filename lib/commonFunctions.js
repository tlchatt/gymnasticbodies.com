
import moment from 'moment-timezone'

export async function storeInLocalStorage(response) {
    console.log("response in storeInLocalStorage:",JSON.stringify(response))
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
    console.log("JSON.stringify(user):",JSON.stringify(user))
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

    let lastPrice, firstTransactionDate, lastTransactionDate, nextPaymentDate, status
    let todaysDate = new Date();
    let todaysIsoDate = todaysDate.toISOString()

    let merchantid = customerData?.result?.profile?.merchantCustomerId ?? null //for new users and old users with no transactions no merchant id
    let AuthorizeNextImport = merchantid ? true : false
    let transactions = customerData?.transactionHistory?.data?.transactions ?? null
    let subscription = customerData?.customerSubscription?.data?.subscription ?? null
    if (incomingData.amount) {//user making a payment for a subscription
        lastPrice = incomingData.amount.toString()
        lastTransactionDate = todaysIsoDate
    } else {
        if (subscription) {
            console.log("subscription:", subscription)
            lastPrice = subscription.amount.toString()
            lastTransactionDate = new Date(subscription.paymentSchedule.startDate)
            // nextPaymentDate = new Date(subscription.paymentSchedule.startDate) ?? null
        }
        if (transactions) {
            console.log("transactions:", transactions)
            let lastTransactions = transactions[0] // most recent transaction
            let firstTransaction = transactions[transactions.length - 1] //oldest transaction
            firstTransactionDate = new Date(firstTransaction?.submitTimeLocal)
            lastTransactionDate = new Date(lastTransactions?.submitTimeLocal)
            lastPrice = lastTransactions?.settleAmount.toString()
        }
    }

    let matchedTerm = lastPrice ? priceMap.find(item => item.price === lastPrice)?.term : null;
    let authorizenetCustomerId = customerData?.result?.profile?.customerProfileId ? customerData?.result?.profile?.customerProfileId : authorizeCustomerIs?.data?.customerProfileId


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
                nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            } else {
                //return new amount found, contact admin
            }
        }
    }

    if (nextPaymentDate < todaysIsoDate) {
        //don't create a subscription
        status = "inactive"
    } else {
        //create a subscription
        status = "active"
    }

    console.log("retuned data from getFlagAndSubscriptionInfo", {
        merchantid: merchantid,
        AuthorizeNextImport: AuthorizeNextImport,
        lastTransactionDate: lastTransactionDate,
        lastTransactionPrice: lastPrice,
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
            lastTransactionPrice: lastPrice,
            firstTransactionDate: firstTransactionDate,
            todaysIsoDate: todaysIsoDate,
            matchedTerm: matchedTerm,
            nextPaymentDate: nextPaymentDate,
            status: status,
            authorizenetCustomerId: authorizenetCustomerId,

        }
    )

}
