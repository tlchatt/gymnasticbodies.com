import { createSubscriptionInAuthorizeWithCustomerProfile, getAllCustomerDataFromAuthorize, getCustomerPaymentProfile, updateCustomerLastName, updateCustomerPaymentProfile } from "@/lib/commonServerFunction";
import { sendCredentialsEmailSG, sendSubsCancelledEmailSG } from "@/lib/sendgrid";
import { createAccountForUser, createAndModifyUserInNeon, getAllAuthUserSettings, getUserWithEmail, insertIntoUserSetting, queryUserSetting, updateUserSetting, updateUserSettingData } from "@/lib/userSettings";
import { ConnectingAirportsOutlined } from "@mui/icons-material";

export async function POST(request) {

   



    /*
    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: {
            "jwtAuthorizationToken": "eyJhbGciOiJIUzUxMiJ9.eyJmbmFtZSI6Ikx1a2UiLCJzdWIiOiJsdWtlc2VhcnJhQGljbG91ZC5jb20iLCJsbmFtZSI6IiIsInR6IjoiQW1lcmljYS9Ub3JvbnRvIiwidGFnaWRzIjpbMTAyLDEyMiwyMjQsMjI2LDIyOCwzMzAsNDQ2LDYxMiw2MTYsNjIwLDYzMiw2OTgsNzg4LDEwMzYsMTMwMV0sImV4cCI6MTc2NTkxMjAxNiwiaWF0IjoxNzY1ODI1NjE2LCJjaWQiOjQxMTg0N30.JLW9ezWmdkQX71VFGT2WOw5Eu1ucx1YSn6ePiRy84oTUhIpdVLJ27d37fBwtBZeKaHyR5LHOvcb7MEqPRDGoNw",
            "jwtRefreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJhbGxhY2Nlc3MiOnRydWUsInN1YiI6Imx1a2VzZWFycmFAaWNsb3VkLmNvbSIsInR6IjoiQW1lcmljYS9Ub3JvbnRvIiwiZnJlZW1lbSI6dHJ1ZSwidHlwZSI6InJlZnJlc2giLCJleHAiOjE3ODEzNzc2MTYsInNwIjp0cnVlLCJpYXQiOjE3NjU4MjU2MTYsImNpZCI6NDExODQ3fQ.Lpdq06b0wowjiV4WeYV9s0TCgtrPMGYn7hRgbxQKil4oh_P2MxSDk80hchDJEaUo6bUNQaVY928u-ntNeUcapQ",
            "timezone": "America/Toronto",
            "isAllAccessUser": true,
            "isFreeMember": true,
            "hasCourseProduct": true
        }
    })
    */
}

export async function GET(request) {
    console.log('Triggered by Vercel cron');
    let dbUser, isExistingUser, renewalDate, price, subscriptionTerm, userSettingsData, authorizeCustomerId, subscriptionStatus, name, lastName
    console.log("hello inside testCron")
    let email = "pfsdfsfdsfc@tlchatt.com"
    try {
        dbUser = await getUserWithEmail(email)

        console.log("dbUser in cronJobs route:", dbUser)
        isExistingUser = dbUser?.id ? true : false

        if (!isExistingUser) {
            console.log("NOT FOUND IN isExistingUser: ", email)
        }

        let matching = await queryUserSetting(dbUser.id, 'subscription')
        console.log("matching:", matching)

        if (matching) {
            if (matching.woocommerceAuthorizeImport) {//only where its an authorize user
                userSettingsData = JSON.parse(matching?.data)
                renewalDate = userSettingsData?.renewaldate
                price = userSettingsData?.price
                subscriptionTerm = userSettingsData?.term
                authorizeCustomerId = matching?.authorizeCustomerId
                lastName = userSettingsData?.last_name

                console.log("lastName:", lastName)
                let authorizeProfile = await getAllCustomerDataFromAuthorize(authorizeCustomerId)
                let paymentProfiles = authorizeProfile?.result?.profile?.paymentProfiles.length > 1 ? authorizeProfile?.result?.profile?.paymentProfiles[1] : authorizeProfile?.result?.profile?.paymentProfiles[0]
                console.log("paymentProfiles:", paymentProfiles)

                if (lastName == "") {//check and update lastname
                    //get the last name if possible and update the payment profile
                    let firstName = userSettingsData?.first_name
                    if (firstName.includes(" ")) {
                        name = firstName.split(" ")

                        lastName = name[1] ?? "N/A"
                        console.log("lastName is:", lastName)
                        let customerPaymentProfile = await getCustomerPaymentProfile(authorizeCustomerId, paymentProfiles?.customerPaymentProfileId)
                        console.log("customerPaymentProfile:", customerPaymentProfile)
                        await updateCustomerPaymentProfile(customerPaymentProfile, name[0], lastName)

                        //update neonDB lastname data too
                        let updatedUserSettingsData = userSettingsData
                        updatedUserSettingsData["first_name"] = name[0]
                        updatedUserSettingsData["last_name"] = lastName

                        await updateUserSettingData(matching, updatedUserSettingsData)
                    } else {
                        //don't move forward
                        console.log("subscription can't be created since lastname not found")
                    }

                } else {
                    //don't move forward
                    console.log("subscription can't be created since lastname not found")
                }



                if (matching.status == "Active") {
                    console.log("matching user with status active:", email)
                    console.log("renewalDate:", renewalDate)
                    console.log("price:", price)
                    console.log("subscriptionTerm:", subscriptionTerm)

                    //check if a subscription already exists already for the user in authorize

                    // let paymentProfileId = authorizeProfile?.result?.profile?.paymentProfiles[0]?.customerPaymentProfileId

                    let authorizeCustomerIs = {
                        data: {
                            customerProfileId: authorizeCustomerId,
                            customerPaymentProfileIdList: paymentProfiles
                        }
                    }
                    let impInfo = {
                        matchedTerm: subscriptionTerm,
                        recentTransactionDate: renewalDate,
                        price: price,
                        lastName: lastName
                    }

                    // console.log("authorizeProfile:", authorizeProfile)
                    // console.log("subscription is:", authorizeProfile?.customerSubscription)
                    console.log("subscription present in authorize", authorizeProfile)
                    if (paymentProfiles.length > 0) {
                        if (authorizeProfile?.customerSubscription?.status) {
                            subscriptionStatus = authorizeProfile?.customerSubscription?.data?.subscription?.status
                            //check status of subscription
                            console.log("subscriptionStatus:", subscriptionStatus)
                            if (subscriptionStatus == "active") {
                                //do nothing
                            } else {
                                //create subscription
                                console.log("create subscription in authorize using the customer profile from authorize")
                                //https://developer.authorize.net/api/reference/index.html#customer-profiles-get-customer-profile

                                await createSubscriptionInAuthorizeWithCustomerProfile(authorizeCustomerIs, impInfo)
                                await updateUserSettingSubscriptionStatus(matching, "TRUE")
                            }
                        } else {
                            console.log("no subscription in authorize")
                            await createSubscriptionInAuthorizeWithCustomerProfile(authorizeCustomerIs, impInfo)
                            await updateUserSettingSubscriptionStatus(matching, "TRUE")
                        }
                    } else {
                        //send error to add payment info
                        console.log("no payment method saved")
                    }

                    // if(authorizeProfile?.customerSubscription)

                } else {
                    console.log("user Inactive")
                    let authorizeProfile = await getAllCustomerDataFromAuthorize(authorizeCustomerId)
                    if (authorizeProfile?.customerSubscription?.status) {
                        console.log("subscription present in authorize", authorizeProfile?.customerSubscription)
                        //check status of the subscription
                        subscriptionStatus = authorizeProfile?.customerSubscription?.data?.subscription?.status
                        //check status of subscription
                        console.log("subscriptionStatus:", subscriptionStatus)

                    } else {
                        console.log("no subscription in authorize")
                    }
                }
            } else {
                console.log("not a authorize user")
            }

        }


        // return new Response('OK', { status: 200, data: dbUser });
        return new Response(JSON.stringify({ message: 'OK', data: dbUser }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error(error);
        return new Response('Error processing request', { status: 200 });//so that webhook doesn't deactivate in wordpress
    }

    // return Response.json({ source: 'cron' });
  }