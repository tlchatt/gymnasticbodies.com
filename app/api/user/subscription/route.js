import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user, user_setting } from "@/Drizzle/db/schema"
import { auth } from "@/lib/auth"; // path to your auth file
import generatePassword from 'generate-password';
import { sendCredentialsEmailSG, sendSubsCancelledEmailSG } from "@/lib/sendgrid";
import { createAccountForUser, createAndModifyUserInNeon, getUserWithEmail, insertIntoUserSetting, queryUserSetting, updateUserSetting } from "@/lib/userSettings";
import { eq } from 'drizzle-orm';
import { getAllCustomerDataFromAuthorize, getAllDataFromFile } from "@/lib/commonServerFunction";
import { getFlagAndSubscriptionInfo } from "@/lib/commonFunctions";

export async function POST(request) {//when subscription webhook is triggered -> status : on-hold / active / cancelled
    /* 
               curl -X POST \
               "https://gymnasticbodies-com.vercel.app/api/user/subscription" \
               -H "Content-Type: application/json" \
               -d '{"status": "active","next_payment_date_gmt" : "2027-08-13T12:00:00", "start_date_gmt":"2026-02-13T12:00:00","end_date_gmt":"2027-08-13T12:00:00", "billing": {"first_name": "Andrew Pagels", "email": "andrew.pagels@gmail.com"},"date_created_gmt":"2026-02-13T12:00:00"}'
           */
    let testJson = {
        status: "active",
        next_payment_date_gmt: "2027-08-13T12:00:00",
        start_date_gmt: "2026-02-13T12:00:00",
        end_date_gmt: "",
        billing: {
            first_name: 'Andrew Pagels',
            email: 'andrew.pagels@gmail.com'
        }
    }

    let dbUser, isExistingUser, password, userSetting
    let json = await request.json()

    try {
        if (json.reason == "checkUserInNeon") {// create an account on login (old user, not in neon)
            dbUser = await getUserWithEmail(json.email)
        }
        else if (json.reason == "registerWPass") {
            password = json?.password
            let username = json?.email?.toLowerCase()
            json.email = username //lowercase email updated in json
            let customerId, impInfo, userInNeon

            // This branch fires on EVERY legacy-AWS login (my. loginActions.js). Its
            // only remaining job for a member who already has a Neon subscription
            // record is returning that record — the Auth.net "resync" below is
            // first-login SEEDING only. From 2026-03 to 2026-07-27 it also ran on
            // every subsequent login, overwriting the row with the member's (usually
            // long-dead) Auth.net profile: Stripe ids nulled, renewaldate reset to
            // N/A → 22 paying Stripe renewals silently reverted, admin grants eaten.
            // Active ARB members don't need the login-time refresh either: the daily
            // /api/cronJobs maintains their state, and the classifier treats
            // authorize_subscription_id as presence-only.
            let existingUser = await getUserWithEmail(username)
            let existingSetting = existingUser?.id ? await queryUserSetting(existingUser.id, "subscription") : null

            if (existingSetting) {
                dbUser = existingUser
                userSetting = existingSetting
            } else {
                let customerData = await getAllDataFromFile(username)//getting authorizeCustomerData from file
                customerId = customerData?.result?.profile?.customerProfileId;

                if (customerId) {
                    let authorizeData = await getAllCustomerDataFromAuthorize(customerId)

                    impInfo = await getFlagAndSubscriptionInfo(authorizeData)

                    dbUser = await createAndModifyUserInNeon(json, impInfo)
                }else{
                    console.error("customer not in authorize. email:",username)
                    //check user in neon db using the userId
                    dbUser = existingUser ?? await getUserWithEmail(json.email)
                    //get userSettings using the userId
                    userSetting = existingSetting ?? await queryUserSetting(dbUser?.id,"subscription")
                }
            }
        }
        else {
            dbUser = await getUserWithEmail(json.billing.email)
            isExistingUser = dbUser?.id ? true : false

            if (!isExistingUser) {
                if (json?.password) {
                    password = json?.password
                } else {
                    password = generatePassword.generate({//https://www.npmjs.com/package/generate-password
                        length: 10,//for better auth 8 is min characters required
                        numbers: true,
                        symbols: true,
                        strict: true
                    });
                }
                dbUser = await createAccountForUser(json)
            }
            await updateUserSubscriptionStatus()

            if (!json?.password) {//only send email if password is not provided by the user 
                await sendEmail()
            }
        }

        // return new Response('OK', { status: 200, data: dbUser });
        return new Response(JSON.stringify({ message: 'OK', data: dbUser, settings:userSetting }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (error) {
        console.error(error);
        return new Response('Error processing request', { status: 200 });//so that webhook doesn't deactivate in wordpress
    }

    /*async function getUserWithEmail() {
        //get user based on the email address
        let returnUser = await db.select().from(user).where(eq(user.email, json.billing.email));
        console.log("user in getUserWithEmail:", returnUser)
        if (returnUser.length > 1) {
            console.warn("warning multiple users in getUserWithEmail:", returnUser)
        }
        return returnUser[0]
    }*/

    async function updateUserSubscriptionStatus() {
        let userSetting
        let settingsRecord = {
            type: 'subscription',
            status: json?.status,
            data: {
                status: json?.status,
                renewaldate: json?.next_payment_date_gmt,
                startdate: json?.start_date_gmt,
                phone: json?.phone ? json.phone : null,
                country: json?.country ? json.country : null,
                email: json?.billing?.email ? json.billing.email : null,
                term: json?.term ? json.term : null,
                first_name: json?.billing?.first_name ? json.billing.first_name : null,
                last_name: json?.billing?.last_name ? json.billing.last_name : null,
                authorizeCustomer: json?.profile,
                authorizeSubscription: json?.subscriptionId,

            },
            userId: dbUser.id,
            authorizeNextImport: json?.authorizeNextImport,
            authorizeCustomerId: json?.authorizeCustomerId,

        }
        let matching = await queryUserSetting(settingsRecord.userId, settingsRecord.type)

        if (matching) {
            userSetting = await updateUserSetting(matching, settingsRecord)
        } else {
            userSetting = await insertIntoUserSetting(settingsRecord)
        }

        return userSetting
    }
    async function sendEmail() {
        let data = {}
        let emailSent

        if (!isExistingUser) {
            if (json.status == "active") {
                data = {
                    email: json.billing.email,
                    password: password
                }
                emailSent = await sendCredentialsEmailSG(data)

            } else {//existing user in woocommerce cancelled pre new DB
                console.warn("POST /api/user/subscription sendEmail !isExistingUser && !active UNHANDLED")
            }
        } else {
            if (json.status == "cancelled") {
                emailSent = await sendSubsCancelledEmailSG(json.billing.email)
            } else {//trial ended primary subscription began
                console.warn("POST /api/user/subscription sendEmail isExistingUser && !cancelled UNHANDLED")
            }
        }

        return emailSent;
    }

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