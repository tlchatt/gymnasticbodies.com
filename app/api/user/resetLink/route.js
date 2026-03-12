import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';
import { sendResetLinkEmailSG } from "@/lib/sendgrid";
import { getUserWithEmail, queryUserSetting } from "@/lib/userSettings";

export async function POST(request) {

    //cmd for curl request to test this endpoint:
    /*curl -X POST \  http://localhost:3001/api/user/resetLink \  -H 'Content-Type: application/json' \  -d '{"email": "pc@tlchatt.com"}'*/

    let testJson = {
        email: 'greggorywiley@tlchatt.com'
    }

    const json = await request.json()
    console.log("json in resetLink route", json)


    json.email = json.email.toLowerCase()
    let dbUser, isExistingUser, userSettings, postAWS
    //check if email in incoming data exists in user table, if it does, send email (the link to reset password page)
    // let userExist = await doesUserExist()
    dbUser = await getUserWithEmail(json.email)
    console.log("dbUser:", dbUser)

    isExistingUser = dbUser?.id ? true : false

    if (isExistingUser) {
        //get userSetting with the userId
        userSettings = await queryUserSetting(dbUser?.id, "subscription")
        console.log("userSettings:", userSettings)
        postAWS = userSettings.postAWS

    }
    console.log("isExistingUser:", isExistingUser)
    console.log("postAWS is:", postAWS)

    if (isExistingUser && (postAWS || postAWS === null)) {//if user exists in the db and has postAWS true
        //return true, and show the password reset screen
        // return new Response('OK', { status: 200 });
        return new Response(JSON.stringify({ id: dbUser?.id }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } else {
        //return false and show error to contact admin.
        return new Response(`New user in password reset, not present in the neon DB`, {

            status: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        })
    }
    // console.log("userExist", userExist)
    //get user settings
    /*if (userExist.status) {//send the reset link email
        let emailSent = await sendEmail(userExist)
        if (emailSent) {
            return new Response('OK', { status: 200 });
        }
    } else {
        //do registration first -> send unsuccessful status. 
        return new Response(`New user in password reset, not present in the neon DB`, {

            status: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        })
    }*/


    async function doesUserExist() {
        let userExistsQuery = await db
            .select()
            .from(user)
            .where(eq(user.email, json.email));
        if (userExistsQuery.length > 0) {
            return { status: true, userInfo: userExistsQuery[0] }
        } else {
            return { status: false }
        }

    }
    async function sendEmail(userExist) {
        let data = {}
        let emailSent

        data = {
            email: json.email,
            userId: userExist.userInfo.id
        }

        // emailSent = await sendResetLinkEmailSG(data)
        // console.warn(emailSent)
        return true
        // return emailSent;
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