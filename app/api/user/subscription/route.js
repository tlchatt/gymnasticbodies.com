import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user, user_setting } from "@/Drizzle/db/schema"
import { auth } from "@/lib/auth"; // path to your auth file
import generatePassword from 'generate-password';
import { sendCredentialsEmailSG, sendSubsCancelledEmailSG } from "@/lib/sendgrid";
import { getUserWithEmail, queryUserSetting } from "@/lib/userSettings";
import { eq } from 'drizzle-orm';

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

    let dbUser, isExistingUser, password
    let json = await request.json()
    console.log("POST /api/user/subscription, JSON:", json)

    try {
        if (json.reason == "checkUserInNeon") {// create an account on login (old user, not in neon)
            dbUser = await getUserWithEmail(json.email)
        }
        else if(json.reason == "getUserSettingInNeon"){
            dbUser = await queryUserSetting(json.userId,json.type)
            console.log("dbUser on server:",dbUser)
        }
        else if (json.reason == "registerWPass") {
            //current date in GMT format
            const today = new Date();
            const isoformat = today.toISOString();
            let newDate = isoformat.split("T")[0]
            let tomorrowDate = new Date();
            tomorrowDate.setDate(new Date().getDate() + 1);
            let tomorrowIso = tomorrowDate.toISOString().split("T")[0];
            console.log(" newDate:", newDate)
            console.log(" tomorrowIso:", tomorrowIso)
            //if date_created_gmt: '2024-12-22T17:58:41', contains current date
            //if deos not match return 200 OK
            // if (!(json?.date_created_gmt?.includes(newDate)) && !(json?.date_created_gmt?.includes(tomorrowIso))) {
            //     console.log("incoming date created does not include todays date")
            //     return new Response('OK', { status: 200 });
            // }

            password = json?.password

            console.log("password in registerWPass:", password)
            dbUser = await createAccountForUser()
        }
        else {
            dbUser = await getUserWithEmail(json.billing.email)
            isExistingUser = dbUser?.user?.id ? true : false

            if (!isExistingUser) {
                //current date in GMT format
                const today = new Date();
                const isoformat = today.toISOString();
                let newDate = isoformat.split("T")[0]
                let tomorrowDate = new Date();
                tomorrowDate.setDate(new Date().getDate() + 1);
                let tomorrowIso = tomorrowDate.toISOString().split("T")[0];
                console.log(" newDate:", newDate)
                console.log(" tomorrowIso:", tomorrowIso)
                //if date_created_gmt: '2024-12-22T17:58:41', contains current date
                //if deos not match return 200 OK
                // if (!(json?.date_created_gmt?.includes(newDate)) && !(json?.date_created_gmt?.includes(tomorrowIso))) {
                //     console.log("incoming date created does not include todays date")
                //     return new Response('OK', { status: 200 });
                // }

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

                console.log("password in !isExistingUser:", password)
                dbUser = await createAccountForUser()
            }


            await updateUserSubscriptionStatus()

            if (!json?.password) {//only send email if password is not provided by the user 
                await sendEmail()
            }
        }

        console.log("dbUser:", dbUser)
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
        console.log("POST /api/user/subscription, updateUserSubscriptionStatus")
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
            userId: dbUser.user.id,
            authorizeNextImport: json?.authorizeNextImport,
            authorizeCustomerId: json?.authorizeCustomerId,

        }
        console.log("settingsRecord:", settingsRecord)
        let matching = await queryUserSetting(settingsRecord.userId, settingsRecord.type)

        if (matching) {
            userSetting = await db.update(user_setting)
                .set({
                    data: settingsRecord.data,
                }).where(eq(user_setting.id, matching.id)).returning();
        } else {
            userSetting = await db.insert(user_setting).values(settingsRecord).returning();
        }

        console.log(" userSetting:", userSetting)

        return userSetting
    }
    async function createAccountForUser() {
        //create account field, which will create the user too.
        console.log("POST /api/user/subscription, createAccountForUser")
        let first_name = json.billing ? json.billing.first_name : json.first_name
        let email = json.billing ? json.billing.email : json.email
        const signUpData = await auth.api.signUpEmail({
            body: {
                name: first_name, // required
                email: email, // required
                password: password, // required
            },
        });
        console.log("new user data for subscription:", signUpData)
        // return signUpData.user
        return signUpData
    }
    async function sendEmail() {
        console.log("POST /api/user/subscription, sendEmail")
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

        console.log("emailSent:", emailSent)
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