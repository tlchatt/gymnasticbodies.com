import { auth } from "@/lib/auth"; // path to your auth file
import { headers } from "next/headers"
import bcrypt from 'bcrypt';
import { hashPassword } from "@/lib/password";
export async function POST(request) {
    try {
        const json = await request.json()
        console.log('signIn json', json)
        //let p = await hashPassword(json.password)
        //console.log("password is:", p)

        /* 
        curl -X POST \
        "http://localhost:3001/api/authentication" \
        -H "Content-Type: application/json" \
        -d '{"username":"pc@tlchatt.com","password":"prachi!!!123"}'
    */

        /*
        let data = await auth.api.signUpEmail({//https://www.better-auth.com/docs/authentication/email-password#sign-up
            body: {
                name: json.username, // required
                email: json.username, // required
                password: json.password, // required
                //image: "https://example.com/image.png",
                // callbackURL: "https://example.com/callback",
            },
        })
            */
        const data = await auth.api.signInEmail({
            body: {
                email: json.username, // required
                password: json.password, // required
                rememberMe: true,
                //callbackURL: "https://example.com/callback",
            },
            // This endpoint requires session cookies.
            headers: await headers(),
        });
        console.log('signIn data', data)
        /*
        let session = await auth.api.getSession({
            headers: await headers()
        })
        console.log('session data', session)
        if (!session) {
            console.log('!session')
        }
            */
        return Response.json(data)

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
    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}