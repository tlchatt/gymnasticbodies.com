import { sendEmailSG } from "@/lib/sendgrid";

// Contact-form relay: always delivered to support@ from contact@ (the Gmail sync parses
// contact@ forms into tickets). Recipients, sender and bcc are fixed here — the form only
// supplies its fields — so this route can't be used to send mail from our domain to anyone.
const SUPPORT_TO = 'support@gymnasticbodies.com';
const CONTACT_FROM = 'contact@gymnasticbodies.com';

// Form fields are interpolated into the email's HTML; escape them.
const clean = (v, max = 5000) => String(v ?? '').slice(0, max)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function POST(request) {
    let json = await request.json()

    try {
        const email = String(json?.email ?? json?.replyTo ?? '').trim();
        const validEmail = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) ? email : null;
        await sendEmailSG({
            to: SUPPORT_TO,
            from: CONTACT_FROM,
            replyTo: validEmail ?? undefined,
            subject: clean(json?.subject || 'Contact Form Submission', 200),
            name: clean(json?.name, 200),
            email: clean(validEmail ?? email, 200),
            phone: clean(json?.phone, 50),
            message: clean(json?.message),
            acquisitionData: clean(json?.acquisitionData, 1000),
        })

        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error(error);
        return new Response('Error processing request', { status: 200 });
    }
}
