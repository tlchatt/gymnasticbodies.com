// Hand-off between better-auth's magic-link plugin (lib/auth.js) and lib/memberSignInLink.js.
// The plugin only ever "sends" a link through its sendMagicLink callback; our reminder emails need
// the URL back instead, so the issuer registers the email here first and the callback drops the
// URL into the slot. A request nobody registered (the public POST /api/auth/sign-in/magic-link)
// finds no slot and nothing is sent — there is no "email me a sign-in link" feature (yet).
// No imports on purpose: lib/auth.js imports this, and this must not import lib/auth.js.
// Link lifetime + how many opens it allows (link-scanners often open it once before the member).
export const SIGN_IN_LINK_HOURS = 72;
export const SIGN_IN_LINK_ATTEMPTS = 3;

const slots = new Map();

const key = (email) => String(email || '').trim().toLowerCase();

export function expectLink(email) {
    slots.set(key(email), null);
}

// sendMagicLink callback. Returns true when the URL was handed to a waiting issuer.
export function deliverLink({ email, url }) {
    const k = key(email);
    if (!slots.has(k)) return false;
    slots.set(k, url);
    return true;
}

export function takeLink(email) {
    const k = key(email);
    const url = slots.get(k) || null;
    slots.delete(k);
    return url;
}
