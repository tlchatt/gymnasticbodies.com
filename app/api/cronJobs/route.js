import { getCorrectNameFormat } from "@/lib/commonFunctions";
import { createSubscriptionInAuthorizeWithCustomerProfile, getAllCustomerDataFromAuthorize, getCustomerPaymentProfile, updateCustomerLastName, updateCustomerPaymentProfile } from "@/lib/commonServerFunction";
import { createAccountForUser, createAndModifyUserInNeon, getAllAuthUserSettings, getUserWithEmail, insertIntoUserSetting, queryUserSetting, updateUserSetting, updateUserSettingData, updateUserSettingSubscriptionStatus } from "@/lib/userSettings";

export async function GET(request) {
    console.log("inside POST in cronJobs")
    const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date()); // "2026-04-22"

    console.log("today:", today)

    let allAuthUsers = await getAllAuthUserSettings()//gets only authorizeUsers
    console.log("allAuthUsers:", allAuthUsers.length)

    for (let userSetting of allAuthUsers) {
        //get useres with active status
        if (userSetting?.status == "Active") {
            let userSettingsData = JSON.parse(userSetting?.data)
            let renewalDate = userSettingsData?.renewaldate
            let email = userSettingsData?.email
            let price = userSettingsData?.price
            let subscriptionTerm = userSettingsData?.term
            let authorizeCustomerId = userSetting?.authorizeCustomerId
            
            let name = await getCorrectNameFormat(userSettingsData?.first_name, userSettingsData?.last_name)

            renewalDate = (renewalDate && renewalDate != "N/A") ? renewalDate = renewalDate.split('T')[0] : null
            // Stripe subscriptions are self-managed via webhooks — skip them here
            if (userSetting.stripeSubscriptionId) {
                console.log('Skipping Stripe-managed user in cron:', email);
                continue;
            }
            if (renewalDate && renewalDate === today) {//for valid renewal date
                console.log("authorizeCustomerId:", authorizeCustomerId)
                console.log("userSettingsData:",userSettingsData)
                console.log("name is:",name)
                let authorizeProfile = await getAllCustomerDataFromAuthorize(authorizeCustomerId)
                console.log("authorizeProfile:", authorizeProfile)
                let paymentProfile = authorizeProfile?.result?.profile?.paymentProfiles
                let payment = paymentProfile?.length == 0 ? null : paymentProfile?.length > 1 ? paymentProfile[1] : paymentProfile[0]
                console.log("renewalDate renewalDate < today:", renewalDate)
                console.log("email is:", email)
                console.log("userSetting:", userSetting)
                // console.log("fullName:", fullName)
                console.log("firstName:", name?.firstName)
                console.log("lastName:", name?.lastName)
                console.log("paymentProfile:", payment)
                await updateCustomerPaymentProfile(payment,  name?.firstName, name?.lastName, authorizeProfile)
                let subscriptionStatus
                let updatedUserSettingsData = userSettingsData
                updatedUserSettingsData["first_name"] = name?.firstName
                updatedUserSettingsData["last_name"] = name?.lastName

                await updateUserSettingData(userSetting.id, updatedUserSettingsData)

                let authorizeCustomerIs = {
                    data: {
                        customerProfileId: authorizeCustomerId,
                        customerPaymentProfileIdList: payment
                    }
                }
                let impInfo = {
                    matchedTerm: subscriptionTerm,
                    recentTransactionDate: renewalDate,
                    price: price,
                    lastName: name?.lastName
                }
                console.log("impInfo:",impInfo)
                console.log("authorizeProfile:::::", authorizeProfile)
                if (payment) {
                    if (authorizeProfile?.customerSubscription?.status) {
                        subscriptionStatus = authorizeProfile?.customerSubscription ? authorizeProfile?.customerSubscription?.data?.subscription?.status : null
                        //check status of subscription
                        console.log("subscriptionStatus:", subscriptionStatus)
                        if (subscriptionStatus && (subscriptionStatus == "active" || subscriptionStatus == "Active")) {
                            //do nothing
                        } else {
                            //create subscription
                            console.log("create subscription in authorize using the customer profile from authorize")
                            //https://developer.authorize.net/api/reference/index.html#customer-profiles-get-customer-profile

                            await createSubscriptionInAuthorizeWithCustomerProfile(authorizeCustomerIs, impInfo)
                            await updateUserSettingSubscriptionStatus(userSetting.id, "TRUE")
                        }
                    } else {
                        console.log("no subscription in authorize")
                        await createSubscriptionInAuthorizeWithCustomerProfile(authorizeCustomerIs, impInfo)
                        await updateUserSettingSubscriptionStatus(userSetting.id, "TRUE")
                    }
                } else {
                    //send error to add payment info
                    console.log("no payment method saved")
                }


            } else {
                //renewalDate not present, show user "no subscription"?
            }
        } else {
            //Auth User is InActive
            //send Email to user?
        }
    }
}