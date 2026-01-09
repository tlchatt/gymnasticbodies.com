import { sendEmailSG } from "@/lib/sendgrid";

export async function POST(request) {//when subscription webhook is triggered -> status : on-hold / active / cancelled
    let json = await request.json()
    console.log("POST /api/user/contactUs, JSON:", json)

    try {
        await sendEmailSG(json)


        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error(error);
        return new Response('Error processing request', { status: 200 });//so that webhook doesn't deactivate in wordpress
    }
}