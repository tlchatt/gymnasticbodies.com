import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting,user_logs } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';
import { queryUserLogsForDate } from "@/lib/userSettings";

export async function POST(request) {
    const json = await request.json()
    console.log("POST /api/user/log, JSON:", json)
    //check if user with userId has same userScheduleDate log
    //if yes, merge the incoming data in that log,
    //if no, create a new log
    try {
        let userLog
        let matching = await queryUserLogsForDate(json.userId, json.userScheduleDate)
        
        let logRecord = {
            userScheduleDate: json.userScheduleDate,
            data: json.updatedData,
            userId: json.userId
        }
        if (matching) {
            userLog = await db.update(user_logs)
                .set({
                    data: json.updatedData
                }).where(eq(user_logs.id, matching.id)).returning();
        }
        else {
            userLog = await db.insert(user_logs).values(logRecord).returning();
        }
        
        return Response.json({status:200})
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
    console.log("DELETE /api/user/log, JSON:", json)
    //check if user with userId has same userScheduleDate log
    //if yes, merge the incoming data in that log,
    //if no, create a new log
    try {
        let userLog
        let matching = await queryUserLogsForDate(json.userId, json.userScheduleDate)
        
        let logRecord = {
            userScheduleDate: json.userScheduleDate,
            data: json.updatedData,
            userId: json.userId
        }
        console.log("logRecord:",logRecord)
        if (matching) {
            userLog = await db.update(user_logs)
                .set({
                    data: json.updatedData
                }).where(eq(user_logs.id, matching.id)).returning();
        }
        else {
            userLog = await db.insert(user_logs).values(logRecord).returning();
        }
        
        return Response.json({status:200})
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

    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}