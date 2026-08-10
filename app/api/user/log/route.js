import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting, user_logs } from "@/Drizzle/db/schema"
import { eq, and } from 'drizzle-orm';
import { upsertUserLog } from "@/lib/userSettings";

export async function POST(request) {
    const json = await request.json()
    // Atomic upsert keyed (userId, section, userScheduleDate). Existing guided-plan
    // clients don't send `section`, so it defaults to 'levels' — their rows and
    // behavior are unchanged. New workout sections pass it explicitly.
    try {
        await upsertUserLog({
            userId: json.userId,
            section: json.section ?? 'levels',
            userScheduleDate: json.userScheduleDate,
            data: json.updatedData,
            progressions: json?.progressions ? json?.progressions : {},
        })

        return Response.json({ status: 200 })
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

export async function DELETE(request) {
    const json = await request.json()
    //check if user with userId has same userScheduleDate log
    //if yes, merge the incoming data in that log,
    //if no, create a new log
    try {
        // NOTE: despite the DELETE verb this has always been an overwrite — the client
        // sends the pruned document as updatedData. Progressions intentionally untouched.
        await upsertUserLog({
            userId: json.userId,
            section: json.section ?? 'levels',
            userScheduleDate: json.userScheduleDate,
            data: json.updatedData,
        })

        return Response.json({ status: 200 })
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
// GET just to return 200 status for preflight to work
export async function GET(request) {
    const searchParams = request.nextUrl.searchParams;
    const userData = Object.fromEntries(searchParams);
    if (userData?.userId) {
        // Section-scoped (default 'levels'): after AWS-history seeding a user can have
        // thousands of autopilot/byo/history/thrive rows — returning them all here would
        // bloat every guided-plan page load.
        let queryExisting = await db.select().from(user_logs)
            .where(and(eq(user_logs.userId, userData.userId), eq(user_logs.section, userData.section ?? 'levels')));

        // let queryExisting = await db.select().from(user_logs).where(eq(user_logs.userId, userData.userId)).where(eq(user_logs.userScheduleDate, userData?.userScheduleDate));
        // console.log("queryExisting:", queryExisting[0])
        let returnData = [{ logs: queryExisting }]
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