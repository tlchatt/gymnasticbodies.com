import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting } from "@/Drizzle/db/schema"
import { auth } from "@/lib/auth"; // path to your auth file
import generatePassword from 'generate-password';
import { sendCredentialsEmailSG } from "@/lib/sendgrid";

export async function POST(request) {//when subscription webhook is triggered -> status : on-hold / active / cancelled
    //cmd for curl request to test this endpoint:
    const json = await request.json()
    console.warn(json)
    const password = generatePassword.generate({//https://www.npmjs.com/package/generate-password
        length: 10,//for better auth 8 is min characters required
        numbers: true,
        symbols: true,
        strict: true
    });
    console.warn(password)
    /* 
            curl -X POST \
            "https://gymnasticbodies-com.vercel.app/api/user/subscription" \
            -H "Content-Type: application/json" \
            -d '{"status": "active","next_payment_date_gmt" : "2026-01-04T08:47:59", "start_date_gmt":"2025-12-26T08:47:59", "billing": {"first_name": "David Wolynski", "email": "davedecatur1803@gmail.com"}}'
        */
    let testJson = {
        status: "active",
        next_payment_date_gmt: "2025-12-26T17:22:53",
        start_date_gmt: "2025-12-19T17:22:53",
        billing: {
            first_name: 'Greggory Wiley',
            email: 'greggorywiley@tlchatt.com'
        }
    }
    try {
        if (json.status == "cancelled") {

        }
        if (json.status == "active") {
            let newAccountInfo = await createAccountForUser()
            console.warn(newAccountInfo)

            let accountSetting = await createAccountSettingsForUser(newAccountInfo)
            console.warn(accountSetting)

            if (accountSetting) {
                await sendEmail()
            }
        }


        return new Response('OK', { status: 200 });
    } catch (error) {
        console.error(error);
        return new Response('Error processing request', { status: 200 });//so that webhook doesn't deactivate in wordpress
    }

    async function createAccountForUser() {
        //create account field, which will create the user too.
        const signUpData = await auth.api.signUpEmail({
            body: {
                name: json.billing.first_name, // required
                email: json.billing.email, // required
                password: password, // required
            },
        });

        return signUpData
    }
    async function createAccountSettingsForUser(newAccountInfo) {
        //write settings, for the user_setting table
        let subscriptionData = {
            status: json.status,
            renewaldate: json.next_payment_date_gmt,
            startdate: json.start_date_gmt
        }

        //attach the new user to user_setting table with subscription data
        const attachedSettingInfo = await db.insert(user_setting).values({
            type: 'subscription',
            data: subscriptionData,
            userId: newAccountInfo.user.id
        }).returning();

        return attachedSettingInfo;
    }
    async function sendEmail() {
        let data = {}
        let emailSent
        data = {
            email: json.billing.email,
            password: password
        }
        emailSent = await sendCredentialsEmailSG(data)
        console.warn(emailSent)
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