import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting, user, account } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { auth } from "@/lib/auth"; // path to your auth file
import { headers } from "next/headers"
import generatePassword from 'generate-password';
import { sendCodeEmailSG, sendCredentialsEmailSG, sendResetLinkEmailSG } from "@/lib/sendgrid";

export async function POST(request) {
    const contentType = request.headers.get('Content-Type');
    const password = generatePassword.generate({//https://www.npmjs.com/package/generate-password
        length: 10,//for better auth 8 is min characters required
        numbers: true,
        symbols: true,
        strict: true
    });

    console.log("password is:", password)
    console.log('Content-Type:', contentType);
    const json = await request.json()
    let newUser = true
    console.log('user json', json)
    console.log('user confirmPassword', json.confirmPassword)
    console.log('user userId', json.userId)


    let testJsonForSubscription = {
        status: "active",
        next_payment_date_gmt: "2025-12-26T17:22:53",
        start_date_gmt: "2025-12-19T17:22:53",
        billing: {
            first_name: 'Greggory Wiley',
            email: 'greggorywiley@tlchatt.com'
        }
    }


    if (json.email && !(json.status)) {//email to get the reset link
        //check if email in incoming data exists in user table, if it does, skip account creation and directly send email about the link to reset password
        let userExist = await doesUserExist()
        console.log("userExist is:", userExist?.userInfo)

        if (userExist.status) {//send the reset link email
            newUser = false
            let emailSent = await sendEmail(newUser, userExist)
            if (emailSent) {
                return new Response('OK', { status: 200 });
            }
        } else {
            //do registration first -> send unsuccessful status. 
            return new Response(`New user in password reset, so error: ${error.message}`, {

                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            })
        }
    }

    if (json.confirmPassword && json.userId) {//reset incoming password to users password
        let updateCredential = await updateUserCredentials()
        console.log("updateCredential is:", updateCredential)
        if (updateCredential) {
            return new Response('OK', { status: 200 });
        }

    }

    if (json.status) {//when subscription webhook is triggered -> status : on-hold / active / cancelled

        let newAccountInfo = await createAccountForUser()

        let accountSetting = await createAccountSettingsForUser(newAccountInfo)

        if (accountSetting) {
            await sendEmail(newUser)
        }

        return new Response('OK', { status: 200 });


    } else {
        try {
            let queryExisting = await db.select().from(user_setting).where(eq(user_setting.userId, json.userId));
            let existing = queryExisting ? queryExisting?.filter(item => item.data.type === json.data.type)[0] : null
            if (existing) {
                console.log('existing', existing)
                let updateQuery = await db.update(user_setting)
                    .set(
                        {
                            type: json.type,
                            data: json.data,
                            userId: json.userId
                        }
                    ).where(eq(user_setting.id, existing.id)).returning();
                console.log('updateQuery return', updateQuery)
                return Response.json(updateQuery)
            }
            else {
                console.log('Not existing', existing)
                let insertQuery = await db.insert(user_setting).values(
                    {
                        type: json.type,
                        data: json.data,
                        userId: json.userId
                    }
                ).returning();
                console.log('insertQuery return', insertQuery)
                return Response.json(insertQuery)
            }
        }
        catch (error) {
            return new Response(`Webhook error: ${error.message}`, {

                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            })
        }
    }

    async function doesUserExist() {
        let userExistsQuery = await db
            .select()
            .from(user)
            .where(eq(user.email, json.email));
        console.log("userExistsQuery is:", userExistsQuery)
        if (userExistsQuery.length > 0) {
            return { status: true, userInfo: userExistsQuery[0] }
        } else {
            return { status: false }
        }

    }
    async function updateUserCredentials() {
        let updateQuery = await db.update(account)
            .set(
                {
                    password: json.confirmPassword,
                }
            ).where(eq(account.userId, json.userId)).returning();
        console.log("updateQuery is:", updateQuery)
        return updateQuery
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
        console.log("signUpData is:", signUpData)
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
        console.log("attachSetting:", attachedSettingInfo)
        return attachedSettingInfo;
    }
    async function sendEmail(newUser, userExist) {
        let data = {}
        let emailSent
        if (newUser) {
            data = {
                email: json.billing.email,
                password: password
            }
            emailSent = await sendCredentialsEmailSG(data)
        } else {
            data = {
                email: json.email,
                userId: userExist.userInfo.id
            }
            emailSent = await sendResetLinkEmailSG(data)
        }

        console.log("email data is:", data)

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