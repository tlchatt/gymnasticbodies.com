import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_logs, user_setting } from "@/Drizzle/db/schema"
import { eq, and } from 'drizzle-orm';
import { queryUserSetting } from "@/lib/userSettings";

export async function POST(request) {
    const json = await request.json()
    console.log("json in userStatus:", json)
    try {
        let userSetting
        let matching = await queryUserSetting(json.userId, json.type)
        let settingsRecord = {
            type: json.type,
            data: json.data,
            userId: json.userId
        }
        if (matching) {

            userSetting = await db.update(user_setting)
                .set({
                    data: settingsRecord.data
                }).where(eq(user_setting.id, matching.id)).returning();
        }
        else {
            userSetting = await db.insert(user_setting).values(settingsRecord).returning();
        }
        console.log("userSetting in POST api/user/userStatus:", userSetting)
        return Response.json(userSetting)
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
export async function GET(request) {
    const searchParams = request.nextUrl.searchParams;
    const userData = Object.fromEntries(searchParams);

    if (userData?.userId) {
        // and() — chained .where().where() silently REPLACES the first condition in this
        // drizzle version, which returned other users' settings rows. Fixed 2026-07.
        let queryExisting = await db.select().from(user_setting)
            .where(and(eq(user_setting.userId, userData.userId), eq(user_setting.type, userData.type)));
        console.log("queryExisting:",queryExisting[0])
        // Guided-plan consumers expect ONLY the 'levels' logs here; without the section
        // filter, seeded autopilot/byo/history/thrive docs would bloat this response.
        let userWithLogs = await db.select().from(user_logs)
            .where(and(eq(user_logs.userId, userData.userId), eq(user_logs.section, userData.section ?? 'levels')))
        console.log("userWithLogs count:", userWithLogs.length)
        let returnData = [{settings:queryExisting[0]},{logs:userWithLogs}]
        console.log("returnData:",returnData)
        return new Response(JSON.stringify(returnData), {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        })
    }

    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}