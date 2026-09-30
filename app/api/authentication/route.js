import { auth } from "@/lib/auth"; // path to your auth file
import { headers } from "next/headers"
import bcrypt from 'bcrypt';
import { hashPassword } from "@/lib/password";
import { logger } from "@/lib/logger";

// my.'s reset-password and create-account forms only accept A-Z a-z 0-9 ! $ # and at most
// 20 characters, and they enforce it by silently IGNORING any other keystroke. A member who
// types "Summer@2026!" there actually saves "Summer2026!", then types "Summer@2026!" at the
// login form (which accepts anything) and is told the password is wrong — right after a
// "Password Saved" message. 34 of 71 members who signed in straight after a reset in Sep
// 2026 failed that first sign-in. Applying the same filter to a failed attempt lets the password the member
// believes they set work. The filtered string is itself a password anyone could type, so
// this lets in no one who could not already get in by typing it.
const RESET_FORM_ALLOWED = /[a-zA-Z0-9!$#]/g
const asResetFormSaved = (pw) => (String(pw).match(RESET_FORM_ALLOWED) || []).join('').slice(0, 20)
export async function POST(request) {
    let email;
    try {
        const json = await request.json()
        email = json.username;
        //let p = await hashPassword(json.password)
        //console.log("password is:", p)

        /* 
        curl -X POST \
        "https://gymnasticbodies-com.vercel.app/api/authentication" \
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
        const signIn = async (password) => auth.api.signInEmail({
            body: {
                email: json.username, // required
                password, // required
                rememberMe: true,
            },
            // This endpoint requires session cookies.
            headers: await headers(),
        });
        let data
        try {
            data = await signIn(json.password)
        } catch (err) {
            const filtered = typeof json.password === 'string' ? asResetFormSaved(json.password) : null
            if (err?.status !== 'UNAUTHORIZED' || !filtered || filtered === json.password) throw err
            data = await signIn(filtered)
            logger.info('auth.signin_reset_form_filtered', { email })
        }
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
        console.log("error is:", error)
        // Neon is my.'s ONLY sign-in rail post-cutover — a failure here is a member who
        // cannot get in at all. better-auth throws an APIError whose status distinguishes
        // bad credentials (UNAUTHORIZED) from server trouble.
        logger.warn('auth.signin_failed', { email, data: { status: error?.status ?? null, message: error?.message ?? String(error) } });
        return Response.json(error)
        // return new Response(`Webhook error: ${error.message}`, {

        //     status: 400,
        //     headers: {
        //         'Access-Control-Allow-Origin': '*',
        //         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        //         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        //     },
        // })
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
    const url = new URL(request.url);
    const token = url.searchParams.get("authToken");
    const session = await auth.api.getSession({
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }
    // User is now authenticated for this request
    return new Response(`Hello, ${session.user.name}`);
    // return new Response('Success!', {
    //     status: 200,
    //     headers: {
    //         'Access-Control-Allow-Origin': '*',
    //         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    //         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    //     },
    // })
}