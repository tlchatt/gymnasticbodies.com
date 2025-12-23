import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting, user, account } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { auth } from "@/lib/auth"; // path to your auth file
import { headers } from "next/headers"
import generatePassword from 'generate-password';
import { sendCodeEmailSG, sendCredentialsEmailSG, sendResetLinkEmailSG } from "@/lib/sendgrid";

export async function POST(request) {
    const json = await request.json()

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