
import { ConnectingAirportsOutlined } from '@mui/icons-material';
import moment from 'moment-timezone'
import FoundationCore from '@/data/FoundationCore';
import FoundationUpperBody from '@/data/FoundationUpperBody';
import FoundationLowerBody from '@/data/FoundationLowerBody';
import workoutData from '@/data/workoutData';
import path from 'path';
import { writeQueue } from './writeFile';
import { promises as fs } from 'fs';

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
    if (transactions) {//rearrange transactions to be in the order latest to oldest.
        transactions = transactions.sort((a, b) => new Date(b.submitTimeLocal) - new Date(a.submitTimeLocal));
    }
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
export async function storeInFile(data) {
    // Define the file path relative to the project root
    try {
        const filePath = path.join(process.cwd(), 'data', 'mediaIdsJwplayer.json');
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

        // return new Response(JSON.stringify({ message: 'Data successfully written' }), {
        //     status: 200,
        //     headers: { 'Content-Type': 'application/json' },
        // });
    } catch (error) {
        console.error('Error writing to file:', error);
        // return new Response(JSON.stringify({ message: 'Error writing data' }), {
        //     status: 500,
        //     headers: { 'Content-Type': 'application/json' },
        // });
    }
}
export async function mapMediaData() {
    // console.log("data length:",data)
    let finalArray = []
    for (let [levelName, levelValue] of Object.entries(workoutData.defaultWorkOutData)) {
        await getData(levelValue)
    }

    /*for (let [levelName, levelValue] of Object.entries(FoundationCore.defaultCoreProgressions)) {
        await getData(levelValue)
    }
    for (let [levelName, levelValue] of Object.entries(FoundationUpperBody.defaultUpperBodyProgressions)) {
        await getData(levelValue)
    }
    for (let [levelName, levelValue] of Object.entries(FoundationLowerBody.defaultLowerBodyProgressions)) {
        await getData(levelValue)
    }*/

    console.log("finalArray 1:", finalArray.length)

    // storeInFile(finalArray)

    async function getData(levelValue) {
        for (let [typeKey, typeValue] of Object.entries(levelValue)) {
            // console.log("typeKey is:", typeKey)
            // console.log("typeValue is:", typeValue)//array
            typeValue.forEach(element => {
                let mediaValues = [];
                let strength = element?.workoutInfo["Strength"]
                let mobility = element?.workoutInfo["Mobility"]

                if (strength) {
                    if (strength?.videos.length > 0) {
                        strength?.videos.forEach(video => {
                            mediaValues.push({
                                "imageName": strength?.imageName,
                                "type": "Program",
                                "position": "workoutInfo.Strength.videos",
                                "videoName": video?.videoName,
                                "exercisesVideoId": video?.exercisesVideoId,
                                "exerciseId": video?.exerciseId,
                                "id": video?.videoName?.split(".")[0]//mediaId in jwplayer
                            })
                        })
                    }
                } else {
                    // console.log("strength?.videos length else:", mobility?.videos?.length)
                }

                if (mobility) {
                    if (mobility?.videos.length > 0) {
                        mobility?.videos.forEach(video => {
                            // console.log("strength?.videos :", mobility?.videos)
                            mediaValues.push({
                                "imageName": mobility?.imageName,
                                "type": "Program",
                                "position": "workoutInfo.mobility.videos",
                                "videoName": video?.videoName,
                                "exercisesVideoId": video?.exercisesVideoId,
                                "exerciseId": video?.exerciseId,
                                "id": video?.videoName?.split(".")[0]//mediaId in jwplayer
                            })
                        })
                    } else {
                        // console.log("mobility?.videos length else:", mobility?.videos?.length)
                    }

                    // console.log("mobility?.technicalTips length if:", mobility?.technicalTips)
                    if (mobility?.technicalTips) {
                        // console.log("mobility?.technicalTips length if:", mobility?.technicalTips.length)

                        if (mobility?.technicalTips.length > 0) {
                            mobility?.technicalTips.forEach(video => {
                                mediaValues.push({
                                    "imageName": mobility?.imageName,
                                    "type": "Program",
                                    "position": "workoutInfo.mobility.technicalTips",
                                    "videoName": mobility?.technicalTips[0]["videoName"],
                                    "exercisesVideoId": video?.exercisesVideoId,
                                    "exerciseId": video?.exerciseId,
                                    "id": mobility?.technicalTips[0]["videoName"]?.split(".")[0]//mediaId in jwplayer
                                })
                            })
                        }

                    } else {
                        // console.log("mobility?.technicalTips length else:", mobility?.technicalTips)
                    }

                }
                else {
                    // console.log("mobility?.videos length else:", mobility?.videos)
                }
                finalArray.push(...mediaValues);
            });
        }
        return finalArray
    }
}
