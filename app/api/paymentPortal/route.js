import { auth } from "@/lib/auth"; // path to your auth file
import { headers } from "next/headers"
import bcrypt from 'bcrypt';
import { hashPassword } from "@/lib/password";
export async function POST(request) {
    try {
        console.log("request is:",request)
        const json = await request.json()
        console.log('paymentPortal json', json)

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