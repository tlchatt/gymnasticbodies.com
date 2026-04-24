import { createSubscriptionInAuthorizeWithCustomerProfile, getAllCustomerDataFromAuthorize, getCustomerPaymentProfile, updateCustomerLastName, updateCustomerPaymentProfile } from "@/lib/commonServerFunction";
import { sendCredentialsEmailSG, sendSubsCancelledEmailSG } from "@/lib/sendgrid";
import { createAccountForUser, createAndModifyUserInNeon, getAllAuthUserSettings, getUserWithEmail, insertIntoUserSetting, queryUserSetting, updateUserSetting, updateUserSettingData, updateUserSettingSubscriptionStatus } from "@/lib/userSettings";
import { ConnectingAirportsOutlined } from "@mui/icons-material";

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

            let fullName = (userSettingsData?.first_name || "").trim().split(" ").filter(Boolean);//trims whitespace from beginning and end of the string. 
            let firstName, lastName
            if (fullName.length == 2) {
                firstName = fullName[0]
                lastName = fullName[1]
            }
            if (fullName.length == 3) {
                firstName = fullName[0]
                lastName = fullName[2]
            }
            if (fullName.length == 1) {
                firstName = fullName[0]
                lastName = "N/A"
            }
            renewalDate = (renewalDate && renewalDate != "N/A") ? renewalDate = renewalDate.split('T')[0] : null
            if (renewalDate && renewalDate === today) {//for valid renewal date
                console.log("authorizeCustomerId:", authorizeCustomerId)
                let authorizeProfile = await getAllCustomerDataFromAuthorize(authorizeCustomerId)
                console.log("authorizeProfile:", authorizeProfile)
                let paymentProfile = authorizeProfile?.result?.profile?.paymentProfiles
                let payment = paymentProfile?.length == 0 ? null : paymentProfile?.length > 1 ? paymentProfile[1] : paymentProfile[0]
                console.log("renewalDate renewalDate < today:", renewalDate)
                console.log("email is:", email)
                console.log("userSetting:", userSetting)
                console.log("fullName:", fullName)
                console.log("firstName:", firstName)
                console.log("lastName:", lastName)
                console.log("paymentProfile:", payment)
                await updateCustomerPaymentProfile(payment, firstName, lastName, authorizeProfile)
                let subscriptionStatus
                let updatedUserSettingsData = userSettingsData
                updatedUserSettingsData["first_name"] = firstName
                updatedUserSettingsData["last_name"] = lastName

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
                    lastName: lastName
                }
                console.log("authorizeProfile:::::", authorizeProfile)
                if (payment) {
                    if (authorizeProfile?.customerSubscription?.status) {
                        subscriptionStatus = authorizeProfile?.customerSubscription ? authorizeProfile?.customerSubscription?.data?.subscription?.status : null
                        //check status of subscription
                        console.log("subscriptionStatus:", subscriptionStatus)
                        if (subscriptionStatus && subscriptionStatus == "active") {
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
