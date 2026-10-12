// Passwordless sign-in links for administrative emails (billing reminders) — built on
// better-auth's own magic-link plugin (lib/auth.js), not a hand-rolled token.
//   - only existing accounts (disableSignUp), token stored hashed in `verification`
//   - expires after SIGN_IN_LINK_HOURS; works SIGN_IN_LINK_ATTEMPTS times (email link-scanners
//     often open a link once before the member does — a strict single use would burn it)
//   - opening it creates a normal better-auth session (cookie) and lands on /accountDetails,
//     scrolled to Manage Subscription; the page logs member.email_link_signin.
// Trade-off (Greggory, 2026-10-12): anyone the email is forwarded to can open the account page
// while the link is valid — the emails say so.
import { auth } from '@/lib/auth';
import { expectLink, takeLink } from '@/lib/signInLinkOutbox';

export { SIGN_IN_LINK_HOURS } from '@/lib/signInLinkOutbox';
// Absolute: better-auth only accepts a #fragment on a full URL of a trusted origin (its own baseURL).
const accountLanding = () => `${auth.options.baseURL}/accountDetails?via=email_link#manage-subscription`;

// Returns the sign-in URL for an existing account's email, or null.
export async function createSignInLink(email) {
    if (!email) return null;
    expectLink(email);
    try {
        await auth.api.signInMagicLink({
            body: { email, callbackURL: accountLanding(), errorCallbackURL: '/accountDetails?signInLink=expired' },
            headers: new Headers(),
        });
        return takeLink(email);
    } catch (err) {
        takeLink(email);
        console.error(JSON.stringify({ level: 'error', event: 'sign_in_link.create_failed', email, error: err?.message }));
        return null;
    }
}
