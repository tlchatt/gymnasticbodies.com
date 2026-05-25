

import moment from 'moment-timezone'
import FoundationCore from '@/data/FoundationCore';
import FoundationUpperBody from '@/data/FoundationUpperBody';
import FoundationLowerBody from '@/data/FoundationLowerBody';
// import workoutData from '@/data/workoutData';
import thriveData from '@/data/mediaData_Thrive.json'
import workoutData2 from '@/data/mediaData_Workout.json'
import testMovingData from '@/data/mediaData_TestMovingData.json'
import supportTesting from '@/data/mediaData_SupportTesting.json'
import onlineClasses from '@/data/mediaData_OnlineClasses.json'
import gbProRefilm from '@/data/mediaData_GB_Pro_ReFlim.json'
import gbProOld from '@/data/mediaData_GB_Pro+(OLD).json'
import gbPro from '@/data/mediaData_GB_Pro+.json'
import lessons from '@/data/mediaData_Lessons.json'
import restoreHamstringPlaylistData from '@/data/restoreHamstringPlaylistData.json'
import thoracicBridgePlaylistData from '@/data/thoracicBridgePlaylistData.json'
import marketing from '@/data/mediaData_Marketing.json'
import customClients from '@/data/mediaData_CustomClients.json'
import quadRestorePlaylistData from '@/data/quadRestorePlaylistData.json'
import hipRestorePlaylistData from '@/data/hipRestorePlaylistData.json'
import scapulaRestorePlaylistData from '@/data/scapulaRestorePlaylistData.json'
import thoracicRestorePlaylistData from '@/data/thoracicRestorePlaylistData.json'
import shoulderRestorePlaylistData from '@/data/shoulderRestorePlaylistData.json'
import ankleAndKneeRestorePlaylistData from '@/data/ankleAndKneeRestorePlaylistData.json'
// import mediaIdsJwPlayerData from '@/data/mediaIdsJwplayer.json'
import path from 'path';
import { writeQueue } from './writeFile';
// import { promises as fs } from 'fs';
import { getAllCustomerDataFromAuthorize, getAllDataFromFile, paymentController } from './commonServerFunction';
import { getUserWithEmail, getUserWithId, queryUserSetting } from './userSettings';



export async function storeInLocalStorage(response) {
    console.log("response in storeInLocalStorage:", JSON.stringify(response))
    const today = new Date();
    const expirationDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const refreshExpireTime = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    let postAWS = !response?.impInfo?.AuthorizeNextImport //postAWS will be true if AuthorizeNextImport is false, meaning the user is not being imported from Authorize.net and can post to AWS
    const timezone = moment.tz.guess();

    let user = {
        ...response?.userInNeon?.user,
        token: response?.userInNeon?.token,
        refreshToken: response?.userInNeon?.token,
        expirationDate: expirationDate,
        refreshExpireTime: refreshExpireTime,
        timezone: timezone,
        postAWS: postAWS
    }

    console.log("JSON.stringify(user):", JSON.stringify(user))
    localStorage.setItem('user', JSON.stringify(user));

    return user
}
export async function getFlagAndSubscriptionInfoForNonAuthUsers(usersettingInfo) {
    let data = JSON.parse(usersettingInfo?.data)
    console.log("data:", data)

    let name = await getCorrectNameFormat(data?.first_name)
    // console.log("name in flag is:", name)

    let todaysDate = new Date();

    return (
        {
            merchantid: "N/A",
            id: usersettingInfo?.userId ?? "N/A",
            authorizenetCustomerId: "N/A",
            subscriptionId: "N/A",
            customerAddressId: "N/A",
            customerPaymentProfileId: "N/A",
            AuthorizeNextImport: false,
            OtherSourcesNextImport: true,//add this as a field in neon db
            status: data?.status ?? "N/A",

            oldestTransactionDate: data?.startdate,
            // recentTransactionDate: usersettingInfo,
            nextPaymentDate: data?.renewaldate,
            todaysDate: todaysDate,

            redableOldestTransactionDate: await getDateString(data?.startdate),
            // redableRecentTransactionDate: await getDateString(recentTransactionDate),
            redableNextPaymentDate: await getDateString(data?.renewaldate),
            redableTodaysDate: await getDateString(todaysDate),

            trial: usersettingInfo?.trial,
            trialStartDate: "N/A",
            trialEndDate: "N/A",

            price: data?.price ?? "N/A",
            matchedTerm: data?.term ?? "N/A",

            firstName: name?.firstName,
            lastName: name?.lastName,
            phoneNumber: data?.phone ?? "N/A",
            country: data?.country ?? "N/A",
            email: data?.email ?? "N/A",
            subscriptionName: data?.productName ?? "N/A",
            hasSubscription: false
        }
    )
}
export async function getFlagAndSubscriptionInfo(customerData, authorizeCustomerIs, incomingData) {
    console.log("customerData inside getFlagAndSubscriptionInfo:", customerData)
    console.log("incomingData inside getFlagAndSubscriptionInfo:", incomingData)
    let environment = process.env.NEXT_PUBLIC_ENVIRONMENT
    console.log("environment:", environment)
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
    let transactions = customerData?.transactionHistory?.data?.transactions ?? null
    if (transactions) {//rearrange transactions to be in the order latest to oldest.
        transactions = transactions.sort((a, b) => new Date(b.submitTimeLocal) - new Date(a.submitTimeLocal));
    }
    let subscription = customerData?.customerSubscription?.data?.subscription ?? null
    if (incomingData?.amount) {//user making a payment for a subscription
        price = incomingData?.amount?.toString()

        if (incomingData.trial) {
            nextPaymentDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);//start date 7 days from today if trial is present
        } else {
            recentTransactionDate = todaysDate
        }
    } else {
        if (subscription) {
            console.log("subscription:", subscription)
            price = subscription.amount.toString()
            // recentTransactionDate = new Date(subscription?.paymentSchedule?.startDate)
            if (new Date(subscription?.paymentSchedule?.startDate) > todaysDate) {
                nextPaymentDate = new Date(subscription?.paymentSchedule?.startDate)
            }
            // nextPaymentDate = new Date(subscription.paymentSchedule.startDate) ?? null
        }
        if (transactions) {
            console.log("transactions:", transactions)
            let recentTransaction = transactions[0] // most recent transaction
            let oldestTransaction = transactions[transactions?.length - 1] //oldest transaction
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
    console.log("nextPaymentDate:", nextPaymentDate)

    // if (subscription) {
    //     if (matchedTerm) {
    //         if (matchedTerm == "monthly") {
    //             nextPaymentDate = new Date(recentTransactionDate);
    //             nextPaymentDate.setMonth(recentTransactionDate.getMonth() - 1);
    //         } else if (matchedTerm == "quarterly") {
    //             nextPaymentDate = new Date(recentTransactionDate);
    //             nextPaymentDate.setMonth(recentTransactionDate.getMonth() - 3);
    //         } else if (matchedTerm == "annually") {
    //             nextPaymentDate = new Date(recentTransactionDate);
    //             nextPaymentDate.setMonth(recentTransactionDate.getFullYear() - 1);
    //         } else {
    //             //return new amount found, contact admin
    //         }
    //     }
    // } else {
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

    // }


    console.log("nextPaymentDate:", nextPaymentDate)
    console.log("todaysDate:", todaysDate)
    console.log("nextPaymentDate < todaysDate:", nextPaymentDate < todaysDate)
    if (nextPaymentDate < todaysDate) {
        //don't create a subscription
        status = "Inactive"
    } else {
        //create a subscription
        console.log("subscription inside:", subscription)
        if (subscription) {
            if (subscription?.status == "canceled") {
                status = "Inactive"
                nextPaymentDate = undefined
            } else {
                status = "Active"
            }
        } else {//new User
            status = "Active"
        }
    }

    console.log("???:", recentTransactionDate)
    //get trial info that is stored in the db
    let dbUser = await getUserWithEmail(incomingData?.email ?? profile?.email)
    console.log("dbUser in getFlagAndSubscriptionInfo:", dbUser)
    let isExistingUser = dbUser?.id ? true : false
    let userSetting, subscriptionId = null
    if (isExistingUser) {
        userSetting = await queryUserSetting(dbUser?.id, 'subscription')
        console.log("matching user setting in getFlagAndSubscriptionInfo:", userSetting)
        subscriptionId = JSON.parse(userSetting?.data)?.authorizeSubscription
        console.log("subscriptionId:", subscriptionId)
    }

    console.log("??? incomingData", paymentProfile)
    let name = await getCorrectNameFormat(incomingData?.firstName ? incomingData?.firstName : paymentProfile?.billTo?.firstName)
    console.log("name in flag is:", name)
    console.log("retuned data from getFlagAndSubscriptionInfo", {
        merchantid: merchantid ?? "N/A",
        id: dbUser?.id ?? "N/A",
        authorizenetCustomerId: authorizenetCustomerId ?? "N/A",
        subscriptionId: subscriptionId,
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

        trial: incomingData?.trial ?? userSetting?.trial ?? false,
        trialStartDate: await getDateString(userSetting?.trialStartDate) ?? "N/A",
        trialEndDate: await getDateString(userSetting?.trialEndDate) ?? "N/A",



        price: price ?? "N/A",
        matchedTerm: matchedTerm ?? "N/A",

        firstName: name?.firstName,
        lastName: name?.lastName,
        phoneNumber: incomingData?.phone ? incomingData?.phone : paymentProfile?.billTo?.phoneNumber ?? "N/A",
        country: incomingData?.country ? incomingData?.country : paymentProfile?.billTo?.country ?? "N/A",
        email: incomingData?.email ? incomingData?.email : profile?.email ?? "N/A",
        subscriptionName: subscriptionProfile?.name ?? "N/A",
        hasSubscription: hasSubscription
    })
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

            oldestTransactionDate: oldestTransactionDate,
            recentTransactionDate: recentTransactionDate,
            nextPaymentDate: nextPaymentDate,
            todaysDate: todaysDate,

            redableOldestTransactionDate: await getDateString(oldestTransactionDate),
            redableRecentTransactionDate: await getDateString(recentTransactionDate),
            redableNextPaymentDate: await getDateString(nextPaymentDate),
            redableTodaysDate: await getDateString(todaysDate),

            trial: incomingData?.trial ?? userSetting?.trial ?? false,
            trialStartDate: await getDateString(userSetting?.trialStartDate) ?? "N/A",
            trialEndDate: await getDateString(userSetting?.trialEndDate) ?? "N/A",

            price: price ?? "N/A",
            matchedTerm: matchedTerm ?? "N/A",

            firstName: name?.firstName,
            lastName: name?.lastName,
            phoneNumber: incomingData?.phone ? incomingData?.phone : paymentProfile?.billTo?.phoneNumber ?? "N/A",
            country: incomingData?.country ? incomingData?.country : paymentProfile?.billTo?.country ?? "N/A",
            email: incomingData?.email ? incomingData?.email : profile?.email ?? "N/A",
            subscriptionName: subscriptionProfile?.name ?? "N/A",
            hasSubscription: hasSubscription
        }
    )

}
export async function getDateString(date) {
    console.log("data in getDateString:", date)
    date = date ? new Date(date) : null;
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

    let finalArray = [];

    // loop over data from jw player (media)
    for (let data of ankleAndKneeRestorePlaylistData) {
        for (let media of data.media) {
            if (media.id) {
                finalArray.push({ id: media.id });
            }
        }
    }
    console.log("finalArray:", finalArray)

    //loop over mediaDataFor 

    // for (let [levelName, levelValue] of Object.entries(workoutData.defaultWorkOutData)) {
    //     await getData(levelValue,finalArray);
    // }

    // for (let [levelName, levelValue] of Object.entries(FoundationCore.defaultCoreProgressions)) {
    //     await getData(levelValue,finalArray)
    // }

    // for (let [levelName, levelValue] of Object.entries(FoundationUpperBody.defaultUpperBodyProgressions)) {
    //     await getData(levelValue,finalArray)
    // }

    // for (let [levelName, levelValue] of Object.entries(FoundationLowerBody.defaultLowerBodyProgressions)) {
    //     await getData(levelValue,finalArray)
    // }

    // console.log("finalArray 1:", mediaIdsJwPlayerData.length)
    // console.log("finalArray :", finalArray)

    // await storeInFile(finalArray)

    async function getData(levelValue, finalArray) {
        // console.log("levelValue:".levelValue)
        let mediaValues = []
        // console.log("mediaIdsJwPlayerData:", mediaIdsJwPlayerData)
        if (levelValue.type == "Class") {
            if (levelValue.workout) {
                //check if the mediaId exists in the mediaIdsPlayer file
                let id = levelValue.workout["mediaId"]?.split(".")[0]
                console.log("id is:", id)
                const hasId = mediaIdsJwPlayerData.some((obj) => obj && obj.id === id);
                console.log("hasId:", hasId)
                if (!hasId) {
                    console.log("NEW")
                    mediaValues.push({
                        "imageName": levelValue.workout["image"],
                        "type": "Class",
                        "position": "workout.mediaId",
                        "mediaId": levelValue.workout["mediaId"],
                        "exercisesVideoId": "N/A",
                        "exerciseId": "N/A",
                        "classId": levelValue.classId,
                        "id": id//mediaId in jwplayer
                    })
                    // finalArray.push(...mediaValues);
                } else {
                    // console.log("DUPLICATE ID FOUND IN CLASS TYPE", id)
                }

            }
        } else {//program

            if (levelValue?.workout) {
                // console.log("levelValue if,", levelValue)
                for (const [key, value] of Object.entries(levelValue?.workout)) {
                    await getProgramData(value, mediaValues, finalArray)
                }

            } else {
                // console.log("level Value in else:", levelValue)
                await getProgramData(levelValue, mediaValues, finalArray)
            }

        }
        console.log("mediaValues:", mediaValues)
        finalArray?.push(...mediaValues);
        // return finalArray
    }
    async function getProgramData(levelValue, mediaValues, finalArray) {
        for (let [typeKey, typeValue] of Object.entries(levelValue)) {
            // console.log("typeKey is:", typeKey)
            // console.log("typeValue is:", typeValue)//array
            typeValue.map(async (element) => {
                // let mediaValues = [];
                let strength = element?.workoutInfo["Strength"]
                let mobility = element?.workoutInfo["Mobility"]

                if (strength) {
                    if (strength?.videos.length > 0) {
                        strength?.videos.forEach(video => {
                            let id = video?.videoName?.split(".")[0]
                            console.log("is is:", id)
                            const hasId = mediaIdsJwPlayerData.some((obj) => obj && obj.id === id);
                            if (!hasId) {
                                console.log("NEW")
                                mediaValues.push({
                                    "imageName": strength?.imageName,
                                    "type": "Program",
                                    "position": "workoutInfo.Strength.videos",
                                    "videoName": video?.videoName,
                                    "exercisesVideoId": video?.exercisesVideoId,
                                    "exerciseId": video?.exerciseId,
                                    "id": id//mediaId in jwplayer
                                })
                            } else {
                                console.log("DUPLICATE ID FOUND IN PROGRAM TYPE, strength", id)
                            }
                        })
                    }
                } else {
                    // console.log("strength?.videos length else:", mobility?.videos?.length)
                }

                if (mobility) {
                    if (mobility?.videos.length > 0) {
                        mobility?.videos.forEach(video => {
                            let id = video?.videoName?.split(".")[0]
                            console.log("is is:", id)
                            const hasId = mediaIdsJwPlayerData.some((obj) => obj && obj.id === id);
                            // console.log("strength?.videos :", mobility?.videos)
                            if (!hasId) {
                                console.log("NEW")
                                mediaValues.push({
                                    "imageName": mobility?.imageName,
                                    "type": "Program",
                                    "position": "workoutInfo.mobility.videos",
                                    "videoName": video?.videoName,
                                    "exercisesVideoId": video?.exercisesVideoId,
                                    "exerciseId": video?.exerciseId,
                                    "id": video?.videoName?.split(".")[0]//mediaId in jwplayer
                                })
                            } else {
                                console.log("DUPLICATE ID FOUND IN PROGRAM TYPE, mobility", id)
                            }

                        })
                    } else {
                        // console.log("mobility?.videos length else:", mobility?.videos?.length)
                    }

                    // console.log("mobility?.technicalTips length if:", mobility?.technicalTips)
                    if (mobility?.technicalTips) {
                        // console.log("mobility?.technicalTips length if:", mobility?.technicalTips.length)

                        if (mobility?.technicalTips.length > 0) {
                            mobility?.technicalTips.forEach(video => {
                                let id = video?.videoName?.split(".")[0]
                                console.log("is is:", id)
                                const hasId = mediaIdsJwPlayerData.some((obj) => obj && obj.id === id);
                                if (!hasId) {
                                    console.log("NEW")
                                    mediaValues.push({
                                        "imageName": mobility?.imageName,
                                        "type": "Program",
                                        "position": "workoutInfo.mobility.technicalTips",
                                        "videoName": mobility?.technicalTips[0]["videoName"],
                                        "exercisesVideoId": video?.exercisesVideoId,
                                        "exerciseId": video?.exerciseId,
                                        "id": mobility?.technicalTips[0]["videoName"]?.split(".")[0]//mediaId in jwplayer
                                    })
                                } else {
                                    console.log("DUPLICATE ID FOUND IN PROGRAM TYPE, mobility?.technicalTips", id)
                                }
                            })
                        }

                    } else {
                        // console.log("mobility?.technicalTips length else:", mobility?.technicalTips)
                    }

                }
                else {
                    // console.log("mobility?.videos length else:", mobility?.videos)
                }

                // finalArray.push(...mediaValues);
            });
        }

        // return finalArray
    }

    async function checkIfInmediaIdsJWSPlayerData(levelValue) {
        let id = levelValue.workout["mediaId"]?.split(".")[0]
        console.log("is is:", id)
        const hasId = mediaIdsJwPlayerData.some((obj) => obj.id === id);
        return hasId
    }


}
export async function getMatchInMediaData(newSetupData, allMediaData) {
    let leftOverMediaIds = [];
    let completedMediaIds = [];
    allMediaData.forEach(obj => {
        obj.media.forEach(media => {
            const found = newSetupData.some(newMedia => newMedia.id === media.id);
            if (found) {
                completedMediaIds.push({ id: media.id });
            } else {
                leftOverMediaIds.push({ id: media.id });
            }
        });
    });
    try {
        await fs.writeFile('data/left.json', JSON.stringify(leftOverMediaIds, null, 2));
        await fs.writeFile('data/done.json', JSON.stringify(completedMediaIds, null, 2));
        console.log('leftOverMediaIds written to data/left.json');
    } catch (err) {
        console.error(err);
    }
    console.log("leftOverMediaIds:", leftOverMediaIds)
    console.log("completedMediaIds:", completedMediaIds)
    return { leftOverMediaIds, completedMediaIds };
}
export async function getAndUseInfoFrompaymentForm(response, userData, amount, term, trial, formRef) {
    let formData
    if (userData) {//for popup modal with payment form (non auth users, paywall checkout)
        formData = new FormData();

        console.log("userData:", userData)

        Object.entries(userData).forEach(([key, value]) => {
            // console.log("key:", key)
            // console.log("value:", value)
            formData.append(key, value);
        });

        formData.append('dataDescriptor', response.opaqueData.dataDescriptor);
        formData.append('dataValue', response.opaqueData.dataValue);
        console.log("formData later:", formData)
        // setEmail(props?.userData?.billEmail)
        // setLoading(true);

    } else {//create the formdata from the form on the page (for auth users)
        //create variables
        console.log("inside paymentFormUpdate", response, amount, term, trial)
        let email = document.querySelector("#email").value;
        console.log("email:", email)
        let phone = document.querySelector("#phone").value;
        console.log("phone:", phone)
        let password = document.querySelector("#password").value;
        console.log("password:", password)
        let country = document.querySelector("#search_country").value;
        let postAWS = true

        document.getElementById("dataDescriptor").value = response.opaqueData.dataDescriptor;
        document.getElementById("dataValue").value = response.opaqueData.dataValue;
        document.getElementById("billToFirstName").value = response.customerInformation.firstName;
        document.getElementById("billToLastName").value = response.customerInformation.lastName;
        document.getElementById("billAmount").value = amount;
        document.getElementById("billEmail").value = email;
        document.getElementById("billPhone").value = phone;
        document.getElementById("billCountry").value = country;
        document.getElementById("userPassword").value = password;
        document.getElementById("billTerm").value = term;
        document.getElementById("postAWS").value = postAWS;
        document.getElementById("trial").value = trial;

        formData = new FormData(formRef.current);
    }



    //set global state email
    // setEmail(email)
    // setLoading(true);



    console.log("formData in paymentFormUpdate is:", formData)

    let payment = await paymentController(formData)

    // console.log("payment from authorizePaymentFunctionality is:", payment)

    return payment

}
export async function getAccountInformation(json) {
    let userEmail, usersettingInfo

    const userInfo = await getUserWithId(json.userId)
    userEmail = userInfo?.email ?? json?.username?.toLowerCase() ?? null

    usersettingInfo = await queryUserSetting(json?.userId, json?.type)

    // No DB record at all — nothing to show
    if (!usersettingInfo) return null

    // --- Step 1: Build impInfo from DB (works for all users) ---
    const data = usersettingInfo?.data ? JSON.parse(usersettingInfo.data) : {}
    const nameParts = (userInfo?.name ?? '').trim().split(' ')
    const activeStatuses = ['active', 'trialing', 'Active']

    const dbImpInfo = {
        id: usersettingInfo.userId,
        email: userEmail ?? data?.email ?? 'N/A',
        firstName: nameParts[0] || data?.first_name || 'N/A',
        lastName: nameParts.slice(1).join(' ') || data?.last_name || '',
        country: data?.country ?? 'N/A',
        phoneNumber: data?.phone ?? 'N/A',
        status: usersettingInfo.status
            ? usersettingInfo.status.charAt(0).toUpperCase() + usersettingInfo.status.slice(1)
            : 'N/A',
        price: data?.price ?? 'N/A',
        amount: data?.price ?? 'N/A',
        matchedTerm: data?.term ?? 'N/A',
        redableNextPaymentDate: await getDateString(data?.renewaldate),
        nextPaymentDate: data?.renewaldate ?? 'N/A',
        redableRecentTransactionDate: await getDateString(data?.startdate),
        hasSubscription: activeStatuses.includes(usersettingInfo.status),
        subscriptionName: data?.productName ?? 'GymFit Membership',
        trial: usersettingInfo.trial ?? false,
        trialEndDate: usersettingInfo.trialEndDate
            ? await getDateString(usersettingInfo.trialEndDate)
            : null,
        OtherSourcesNextImport: false,
        subscriptionId: usersettingInfo.stripeSubscriptionId ?? usersettingInfo.authorizeSubscriptionId ?? 'N/A',
        merchantid: 'N/A',
        authorizenetCustomerId: 'N/A',
    }

    let cardType = 'N/A'
    let cardNumber = 'N/A'
    let impInfo = dbImpInfo

    // --- Step 2: Enrich from Stripe if subscription exists ---
    if (usersettingInfo.stripeSubscriptionId) {
        try {
            const { stripe } = await import('@/lib/stripeServerFunction')
            const sub = await stripe.subscriptions.retrieve(
                usersettingInfo.stripeSubscriptionId,
                { expand: ['default_payment_method'] }
            )
            const priceItem = sub.items?.data?.[0]
            const unitAmount = priceItem?.price?.unit_amount ?? 0
            const interval = priceItem?.price?.recurring?.interval ?? 'month'
            const intervalCount = priceItem?.price?.recurring?.interval_count ?? 1
            const termLabel = interval === 'year' ? 'annually' : intervalCount === 3 ? 'quarterly' : 'monthly'
            const periodEnd = priceItem?.current_period_end ?? sub.current_period_end
            const nextDate = new Date(periodEnd * 1000)
            const pm = sub.default_payment_method

            const stripeStatus = sub.status
            const stripeStatusFormatted = stripeStatus === 'active' || stripeStatus === 'trialing' ? 'Active' : stripeStatus

            impInfo = {
                ...dbImpInfo,
                status: stripeStatusFormatted,
                price: (unitAmount / 100).toFixed(2),
                amount: (unitAmount / 100).toFixed(2),
                matchedTerm: termLabel,
                redableNextPaymentDate: nextDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                nextPaymentDate: nextDate,
                hasSubscription: stripeStatus === 'active' || stripeStatus === 'trialing',
                trial: stripeStatus === 'trialing',
                trialEndDate: sub.trial_end
                    ? new Date(sub.trial_end * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                    : dbImpInfo.trialEndDate,
                subscriptionId: usersettingInfo.stripeSubscriptionId,
            }
            cardType = pm?.card?.brand ?? 'N/A'
            cardNumber = pm?.card?.last4 ? `xxxx${pm.card.last4}` : 'N/A'
        } catch (e) {
            console.error('Stripe enrichment failed, falling back to DB data:', e?.message)
        }
    }

    // --- Step 3: Enrich from Authorize.net if present (preserves legacy behavior) ---
    const authorizeCustomerId = usersettingInfo?.authorizeCustomerId
    let resolvedAuthorizeId = (!authorizeCustomerId || authorizeCustomerId === 'N/A')
        ? (await getAllDataFromFile(userEmail))?.result?.profile?.customerProfileId
        : authorizeCustomerId

    if (resolvedAuthorizeId) {
        try {
            const authorizeData = await getAllCustomerDataFromAuthorize(resolvedAuthorizeId)
            if (authorizeData?.result) {
                impInfo = await getFlagAndSubscriptionInfo(authorizeData)
                const paymentProfile = authorizeData?.result?.profile?.paymentProfiles?.[0]?.payment
                const transactionProfile = authorizeData?.transactionHistory?.data?.transactions
                return {
                    cardType: paymentProfile?.creditCard?.cardType ?? 'N/A',
                    cardNumber: paymentProfile?.creditCard?.cardNumber ?? 'N/A',
                    recentTransaction: transactionProfile ? transactionProfile[0] : 'N/A',
                    transactionHistory: transactionProfile ?? 'N/A',
                    lastTransactionStatus: transactionProfile ? transactionProfile[0]?.transactionStatus : 'N/A',
                    lastTransactionInvoiceNumber: transactionProfile ? transactionProfile[0]?.invoiceNumber : 'N/A',
                    impInfo,
                }
            }
        } catch (e) {
            console.error('Authorize.net enrichment failed, falling back to DB data:', e?.message)
        }
    }

    return {
        cardType,
        cardNumber,
        recentTransaction: 'N/A',
        transactionHistory: 'N/A',
        lastTransactionStatus: 'N/A',
        lastTransactionInvoiceNumber: 'N/A',
        impInfo,
    }
}
export async function getAccountInformationOld(json) {
    let usersettingInfo = await queryUserSetting(json?.userId, json?.type)//get User Setting from neon db
    console.log("usersettingInfo:", usersettingInfo)

    let userEmail = usersettingInfo ? JSON.parse(usersettingInfo?.data).email : null//has email
    console.log("userEmail:", userEmail)
    let customerId = usersettingInfo?.authorizeCustomerId
    console.log("customerId before:", customerId)

    if (!userEmail) {//if user doesn't have email in userSetting
        let userInfo = await getUserWithId(json.userId)//to get userInfo from neon db
        console.log("userInfo:", userInfo)
        userEmail = userInfo ? userInfo?.email : null
        if (!userInfo) {
            userEmail = json?.username
        }
    }

    console.log("userEmail:", userEmail)

    if (!customerId || customerId == "N/A") {
        userEmail = userEmail?.toLowerCase();
        let customerData = await getAllDataFromFile(userEmail)//getting authorizeCustomerData from file
        customerId = customerData?.result?.profile?.customerProfileId;
    }

    console.log("Authorize customerId:", customerId)
    let authorizeData, impInfo
    if (customerId) {
        authorizeData = await getAllCustomerDataFromAuthorize(customerId)
        console.log("authorizeData:", authorizeData)
        impInfo = await getFlagAndSubscriptionInfo(authorizeData)
        console.log("impInfo in getAccountInformation:", impInfo)
    }

    if (authorizeData?.result) {
        let paymentProfile = authorizeData?.result?.profile?.paymentProfiles?.[0]?.payment
        let transactionProfile = authorizeData?.transactionHistory?.data?.transactions
        console.log("paymentProfile:", paymentProfile)
        return {
            cardType: paymentProfile?.creditCard?.cardType ?? "N/A",
            cardNumber: paymentProfile?.creditCard?.cardNumber ?? "N/A",
            recentTransaction: transactionProfile ? transactionProfile[0] : "N/A",
            transactionHistory: transactionProfile ?? "N/A",
            lastTransactionStatus: transactionProfile ? transactionProfile[0]?.transactionStatus : "N/A",
            lastTransactionInvoiceNumber: transactionProfile ? transactionProfile[0]?.invoiceNumber : "N/A",
            impInfo: impInfo
        };
    }
    else if (usersettingInfo?.woocommerceSource == "braintree_credit_card" || usersettingInfo?.woocommerceSource == "paypal") {
        impInfo = await getFlagAndSubscriptionInfoForNonAuthUsers(usersettingInfo)
        return {
            impInfo: impInfo
        }

    } else {
        return
    }

}

export async function getCorrectNameFormat(firstName, lastName) {
    
    firstName = (firstName || "").trim();
    lastName = (lastName || "").trim();
  
    // Case 1: lastName already provided
    if (lastName) {
      return { firstName, lastName };
    }
  
    // Case 2: no lastName, but firstName has multiple words
    const parts = firstName.split(" ").filter(Boolean);
    
    if (parts.length > 1) {
      lastName = parts.pop(); // take last word
      firstName = parts.join(" "); // rest becomes firstName
    } else {
      // Only 1 word total, no last name given
      lastName = "N/A";
    }
  
    return { firstName, lastName };
  }