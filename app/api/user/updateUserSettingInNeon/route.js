import { sendCredentialsEmailSG, sendSubsCancelledEmailSG } from "@/lib/sendgrid";
import { createAccountForUser, createAndModifyUserInNeon, getUserWithEmail, insertIntoUserSetting, queryUserSetting, updateUserSetting } from "@/lib/userSettings";

export async function POST(request) {

    let dbUser, isExistingUser, password

    let json = await request.json()
    let email = json?.email
    // console.log("POST /api/user/updateUserInNeon, email:", email)

    try {

        dbUser = await getUserWithEmail(email)

        isExistingUser = dbUser?.id ? true : false

        await updateUserSubscriptionStatus()


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
        let userSetting
        let settingsRecord = {
            authorizeCustomerId: json?.authorizeCustomerId,
        }
        // console.log("settingsRecord:", settingsRecord)
        let matching = await queryUserSetting(dbUser.id, 'subscription')

        if (matching) {
            // console.log("inside matching")
            userSetting = await updateUserSetting(matching, settingsRecord)
        }

        // console.log(" userSetting:", userSetting)

        return userSetting
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