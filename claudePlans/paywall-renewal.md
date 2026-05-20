# Plan: Paywall / Renewal Flow for Lapsed Auth.net Users

## Status: PLANNING

**Context:** Auth.net users whose subscriptions lapse need to be redirected from `my.gymnasticbodies.com` to `app.gymnasticbodies.com/renew` to re-subscribe via Stripe. After renewal they should receive a better-auth session token and be redirected back to `my.gymnasticbodies.com` as a logged-in, active subscriber — bypassing the legacy `api.gymnasticbodies.com` that still reads from Auth.net.

---

## Files to Create/Modify

| File | Change |
|---|---|
| `app/api/user/renewalStatus/route.js` | **NEW** — checks if an email belongs to a lapsed subscriber |
| `app/api/stripe/renew-subscription/route.js` | **NEW** — processes renewal payment for existing user |
| `app/renew/page.js` | **NEW** — renewal checkout page |
| `components/RenewalPortal.js` | **NEW** — form (password + CardElement, no new account) |
| `lib/userSettings.js` | Add `updateUserSettingRenewal` helper |
| `my.gymnasticbodies.com/src/Store/Action/loginActions.js` | Add renewal check after successful login |

---

## Step 1: `GET /api/user/renewalStatus` (app.gymnasticbodies.com)

Called by `my.gymnasticbodies.com` immediately after login to decide whether to redirect.

```js
// app/api/user/renewalStatus/route.js
export async function GET(request) {
    const email = new URL(request.url).searchParams.get('email');
    if (!email) return NextResponse.json({ needsRenewal: false });

    const user = await getUserWithEmail(email);
    if (!user) return NextResponse.json({ needsRenewal: false });

    const setting = await queryUserSetting(user.id, 'subscription');
    if (!setting) return NextResponse.json({ needsRenewal: false });

    // Active Stripe subscription — webhooks manage this
    if (setting.stripeSubscriptionId && setting.status === 'active') {
        return NextResponse.json({ needsRenewal: false });
    }

    const data = JSON.parse(setting.data ?? '{}');
    const renewalDate = data.renewaldate ?? data.nextPaymentDate;
    const expired = renewalDate && new Date(renewalDate) < new Date();
    const lapsed = ['cancelled', 'inactive', 'Inactive', 'Cancelled'].includes(setting.status)
                || ['cancelled', 'inactive'].includes(data.status?.toLowerCase?.() ?? '');

    return NextResponse.json({ needsRenewal: Boolean(expired || lapsed) });
}
```

**Add CORS headers** — this endpoint is called cross-origin from `my.gymnasticbodies.com`.

---

## Step 2: `POST /api/stripe/renew-subscription` (app.gymnasticbodies.com)

Renewal for an existing user. No new account creation, no trial, no credentials email.

```
Body: { paymentMethodId, email, password }

Flow:
1. Verify identity: auth.api.signInEmail({ email, password })
   — Returns { user, session } with token in Set-Cookie / response body
   — If fails (wrong password or user not found): return 401

2. getUserWithEmail(email) → user
   queryUserSetting(user.id, 'subscription') → setting
   const currentData = JSON.parse(setting.data ?? '{}')

3. Stripe customer:
   — If setting.stripeCustomerId: use it (existing customer)
   — Else: createStripeCustomer(email, name, phone, country) → new customer

4. attachPaymentMethod(paymentMethodId, customer.id)

5. createStripeSubscription(customer.id, STRIPE_PRICE_ID, 0)  // no trial

6. Handle requires_action (3DS):
   — If paymentIntent.status === 'requires_action':
     return { requiresAction: true, clientSecret }

7. updateUserSettingRenewal(setting, {
       stripeCustomerId: customer.id,
       stripeSubscriptionId: subscription.id,
       status: 'active',
       data: JSON.stringify({
           ...currentData,
           status: 'active',
           renewaldate: new Date(subscription.current_period_end * 1000).toISOString(),
       })
   })

8. Return { success: true, token: <better-auth session token> }
   — Token is used by my.gymnasticbodies.com for the authToken redirect
```

On any Stripe error: `deleteStripeCustomer` only if a NEW customer was created in step 3.

---

## Step 3: Add `updateUserSettingRenewal` to `lib/userSettings.js`

Existing `updateUserSetting` spreads a full `settingsRecord` object. Add a targeted helper for renewal:

```js
export async function updateUserSettingRenewal(matching, { stripeCustomerId, stripeSubscriptionId, status, data }) {
    return db.update(user_setting)
        .set({ stripeCustomerId, stripeSubscriptionId, status, data })
        .where(eq(user_setting.id, matching.id))
        .returning();
}
```

Export it and import it in the renewal route.

---

## Step 4: `/renew/page.js` (app.gymnasticbodies.com)

```jsx
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Suspense } from 'react';
import RenewalPortal from '@/components/RenewalPortal';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function RenewPage({ searchParams }) {
    return (
        <Elements stripe={stripePromise}>
            <Suspense>
                <RenewalPortal email={searchParams?.email} />
            </Suspense>
        </Elements>
    );
}
```

---

## Step 5: `components/RenewalPortal.js`

Mirrors `PaymentPortal.js` but for existing users. Key differences:

- **Props:** `email` (pre-filled, read-only)
- **Fields:** password input + `CardElement` only (no email/phone/country/name fields)
- **No `storeInLocalStorage`** redirect on success — use `authToken` redirect same as checkout
- **Submit flow:**

```js
const handleSubmit = async () => {
    const password = document.querySelector('#renew-password')?.value;

    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: { email },
    });
    if (pmError) { setError(pmError.message); return; }

    const result = await fetch('/api/stripe/renew-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id, email, password }),
    }).then(r => r.json());

    if (result.requiresAction) {
        const { error } = await stripe.confirmCardPayment(result.clientSecret);
        if (error) { setError(error.message); return; }
    }

    if (!result.success) { setError(result.message ?? 'Renewal failed.'); return; }

    // Same redirect pattern as PaymentPortal
    window.location.href = `https://my.gymnasticbodies.com/?authToken=${result.token}&source=renewal`;
};
```

**UI:** "Your subscription has expired" message at top, email displayed as static text, password field, CardElement, submit button. Match existing MUI theme.

---

## Step 6: Hook in `my.gymnasticbodies.com` login

**File:** `src/Store/Action/loginActions.js`

In the `Login` thunk, after the successful legacy auth dispatch (around line 245, after `dispatch(LoginAsync(...))`), add:

```js
// Check if this user's subscription has lapsed — redirect to renewal if so
try {
    const renewalRes = await fetch(
        `${process.env.REACT_APP_API_NEW}/api/user/renewalStatus?email=${encodeURIComponent(username)}`
    );
    if (renewalRes.ok) {
        const { needsRenewal } = await renewalRes.json();
        if (needsRenewal) {
            window.location.href = `https://app.gymnasticbodies.com/renew?email=${encodeURIComponent(username)}`;
            return;
        }
    }
} catch (_) {
    // Never block login on a renewal check failure
}
```

`username` is the email field already in scope. `REACT_APP_API_NEW` is already in the env (`https://gymnasticbodies-com.vercel.app` or `https://app.gymnasticbodies.com`).

---

## Getting the Token from better-auth `signInEmail`

`auth.api.signInEmail` is a better-auth server action. Call it with `{ body: { email, password } }`. It returns a Response object — the session token is in the `Set-Cookie` header and/or the JSON body as `token`. Extract it:

```js
import { auth } from '@/lib/auth';

const signInRes = await auth.api.signInEmail({
    body: { email, password },
});
// better-auth v1: signInRes is a Response; read json for token
const signInData = await signInRes.json();
// signInData = { user, session, token } — token is the raw session value
const token = signInData.token;
```

Verify the exact return shape when implementing — better-auth v1.4.x returns `{ user, session }` where `session.token` is the raw JWT/opaque token value used in the authToken redirect.

---

## Implementation Order

1. `lib/userSettings.js` — add `updateUserSettingRenewal` export
2. `app/api/user/renewalStatus/route.js` — new endpoint (read-only, safe first)
3. `app/api/stripe/renew-subscription/route.js` — new endpoint
4. `app/renew/page.js` + `components/RenewalPortal.js` — UI
5. `my.gymnasticbodies.com/src/Store/Action/loginActions.js` — hook

---

## Verification

**Happy path (existing expired user):**
- [ ] Log in on `my.gymnasticbodies.com` with an expired user's email
- [ ] Redirected to `https://app.gymnasticbodies.com/renew?email=xxx`
- [ ] Email field is pre-filled and read-only
- [ ] Enter password + test card `4242 4242 4242 4242`
- [ ] Submit → loading spinner
- [ ] Neon: `user_setting` updated with new `stripeSubscriptionId`, `status = 'active'`, `renewaldate` set
- [ ] Stripe: new subscription visible in dashboard
- [ ] Redirected to `my.gymnasticbodies.com/?authToken=xxx&source=renewal`
- [ ] User has full access on `my.gymnasticbodies.com`

**Error paths:**
- [ ] Wrong password → inline error "Invalid credentials", no payment taken
- [ ] Declined card `4000 0000 0000 0002` → inline error, no subscription created
- [ ] Active subscriber visits `/renew` → `needsRenewal: false` → no redirect on login, page still accessible but clicking submit will hit wrong-state guard

**Edge cases:**
- [ ] User with no Neon record (pure free member) → `needsRenewal: false` → login continues normally
- [ ] Already-Stripe user with active sub → `needsRenewal: false` → no redirect

---

---

## [COMPLETE] Replace Authorize.net Checkout with Stripe

**Verified working (2026-05-18, live mode):**
- New signups go through Stripe (7-day trial, $75/month)
- User + subscription created in Neon on checkout
- Redirect to `my.gymnasticbodies.com` with auth token
- Webhooks handle renewals, cancellations, and payment failures
- Existing Auth.net users untouched

---

## [COMPLETE] Fix: Google Analytics Not Loading

**File:** `app/layout.js` — Added missing `<Script id="google-analytics-init">` block with `window.dataLayer` init.
**Env var:** `NEXT_PUBLIC_ANALYTICS_TAG=G-6V1QXBQ18K`



**File:** `app/layout.js`

**Problem:** The GA script tag loads `gtag.js` but is missing the inline initialization script. Without it, the library loads but never configures or fires.

**Fix:** Add a second `<Script>` block immediately after the existing one inside the `analytics_tag &&` block:

```jsx
<Script id="google-analytics-init">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${analytics_tag}');
  `}
</Script>
```

**Env var:** `NEXT_PUBLIC_ANALYTICS_TAG=G-6V1QXBQ18K` (already set in `.env`)

---

## Context

The platform migrated from WooCommerce (orders billed via Auth.net) → Auth.net ARB native subscriptions. That migration is mid-flight using a cron job that creates Auth.net subscriptions on each user's renewal date. Auth.net has now failed entirely, breaking all new signups.

**Immediate goal:** Replace the new-signup checkout flow with Stripe, leave existing users' Auth.net data untouched. When existing users' subscriptions eventually lapse, a future "Stripe renewal" paywall will handle re-subscription (out of scope here).

---

## Files to Change

| File | Change |
|---|---|
| `Drizzle/db/schema.ts` | Add 2 columns to `user_setting` |
| `lib/userSettings.js` | Update `createAndModifyUserInNeon`, `updateUserSetting`; add 2 new query helpers |
| `components/PaymentPortal.js` | **Full rewrite** — remove AcceptUI, add Stripe CardElement |
| `app/checkout/page.js` | Remove Auth.net `<Script>`, add Stripe `<Elements>` wrapper |
| `app/api/cronJobs/route.js` | Guard: skip users with `stripeSubscriptionId` |
| **NEW** `lib/stripeServerFunction.js` | Server-side Stripe helpers |
| **NEW** `app/api/stripe/create-subscription/route.js` | Core checkout API (replaces paymentPortal for new users) |
| **NEW** `app/api/stripe/webhook/route.js` | Handles subscription lifecycle events |

**Do NOT touch:**
- `lib/commonServerFunction.js` — Auth.net code stays for existing user account pages
- `app/api/paymentPortal/route.js` — leave in place
- `components/Forms.js` — no changes (works as-is)

---

## Step 1: Install Packages

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

---

## Step 2: Environment Variables

**Start in test mode.** Use `pk_test_` / `sk_test_` keys first — everything works identically to live mode. Swap to live keys only after end-to-end testing passes.

Add to `.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...                    # server-only
STRIPE_WEBHOOK_SECRET=whsec_...                  # server-only (from Stripe CLI or dashboard)
STRIPE_PRICE_ID=price_...                        # server-only (monthly $75 test Price ID)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # client-safe
```

**Stripe Dashboard pre-work (Test Mode):**
1. Make sure the toggle in the top-right is set to **Test mode**
2. Create Product: "GymFit TV Subscription"
3. Create Price: $75.00 USD / month recurring → copy `price_xxx` into `STRIPE_PRICE_ID`
4. For local webhook testing, use the Stripe CLI instead of a dashboard endpoint:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the CLI's webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`
5. Once ready to deploy to Vercel preview: create a Webhook endpoint in the dashboard at `https://app.gymnasticbodies.com/api/stripe/webhook` subscribing to `invoice.payment_succeeded`, `customer.subscription.deleted`, `invoice.payment_failed`

**When ready for production:** swap all four env vars to their `pk_live_` / `sk_live_` equivalents and create a separate live-mode webhook endpoint.

---

## Step 3: Schema Migration

**`Drizzle/db/schema.ts`** — add 2 columns to `user_setting` (after `subscriptionInAuthorize`):

```ts
stripeCustomerId: text("stripe_customer_id"),
stripeSubscriptionId: text("stripe_subscription_id"),
```

Then run:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

This produces two `ADD COLUMN` statements — additive only, no existing rows are affected, both nullable.

---

## Step 4: Update `lib/userSettings.js`

### 4a. Update `createAndModifyUserInNeon` — add 4th optional param

```js
export async function createAndModifyUserInNeon(incomingData, impInfo, subscriptionForCustomer, stripeData = null) {
```

Inside `settingsRecord` add:
```js
stripeCustomerId: stripeData?.stripeCustomerId ?? null,
stripeSubscriptionId: stripeData?.stripeSubscriptionId ?? null,
```

### 4b. Update `updateUserSetting` — include new Stripe columns in `.set()`

```js
.set({
    data: settingsRecord.data,
    awsCustomerId: settingsRecord?.awsCustomerId,
    status: settingsRecord.status,
    stripeCustomerId: settingsRecord?.stripeCustomerId,      // ADD
    stripeSubscriptionId: settingsRecord?.stripeSubscriptionId, // ADD
})
```

### 4c. Add `getUserSettingByStripeSubscriptionId` (for webhook lookups)

```js
export async function getUserSettingByStripeSubscriptionId(stripeSubscriptionId) {
    const results = await db.select().from(user_setting)
        .where(eq(user_setting.stripeSubscriptionId, stripeSubscriptionId));
    return results[0] ?? null;
}
```

### 4d. Add `updateUserSettingStatus` (for webhook status changes)

```js
export async function updateUserSettingStatus(matching, status, updatedData) {
    return db.update(user_setting)
        .set({ status, data: updatedData })
        .where(eq(user_setting.id, matching.id))
        .returning();
}
```

---

## Step 5: Create `lib/stripeServerFunction.js`

```js
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function createStripeCustomer(email, name, phone, country) {
    return stripe.customers.create({ email, name, phone, metadata: { country } });
}

export async function attachPaymentMethod(paymentMethodId, customerId) {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId }
    });
}

export async function createStripeSubscription(customerId, priceId, trialDays = 7) {
    return stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent']
    });
}

export async function deleteStripeCustomer(customerId) {
    return stripe.customers.del(customerId);
}

export { stripe };
```

---

## Step 6: Create `app/api/stripe/create-subscription/route.js`

Accepts JSON (not FormData). Returns the same shape that `storeInLocalStorage` in `lib/commonFunctions.js` expects (reads `response.userInNeon.user` and `response.userInNeon.token`).

```
POST /api/stripe/create-subscription
Body: { paymentMethodId, email, phone, country, password, amount, term, trial }

Flow:
1. Check for existing active user (getUserWithEmail → queryUserSetting)
   → If has stripeSubscriptionId: return { existingCustomer: true }

2. createStripeCustomer(email, name, phone, country)

3. attachPaymentMethod(paymentMethodId, customer.id)

4. trialDays = (trial === 'true') ? 7 : 0
   createStripeSubscription(customer.id, STRIPE_PRICE_ID, trialDays)

5. Handle requires_action (rare for trial subs — no immediate charge):
   If subscription.latest_invoice.payment_intent.status === 'requires_action':
     return { requiresAction: true, clientSecret: paymentIntent.client_secret }

6. Build impInfo:
   {
     status: 'Active',
     firstName: email.split('@')[0],
     lastName: 'N/A',
     nextPaymentDate: new Date(Date.now() + (trialDays + 30) * 86400000),
     oldestTransactionDate: new Date(),
     matchedTerm: term ?? 'monthly',
     price: amount ?? '75',
     phone, country,
     AuthorizeNextImport: false,
     authorizenetCustomerId: null,
   }

7. Build stripeData: { stripeCustomerId: customer.id, stripeSubscriptionId: subscription.id }

8. dbUser = await createAndModifyUserInNeon(
     { email, password, phone, country, trial: trialDays > 0 },
     impInfo,
     { data: { profile: 'N/A', subscriptionId: 'N/A' } },
     stripeData
   )

9. await sendCredentialsEmailSG({ email, password })

10. Return:
    {
      message: 'Subscription Created Successfully',
      existingCustomer: false,
      transaction: true,
      customerCreated: true,
      subscriptionCreated: true,
      data: JSON.stringify({
        email,
        userInNeon: dbUser,        // storeInLocalStorage reads .userInNeon.user + .userInNeon.token
        token: dbUser?.token,
        impInfo,
        firstName: impInfo.firstName,
        lastName: impInfo.lastName
      })
    }

Error handling:
- If attachPaymentMethod or createStripeSubscription throws: call deleteStripeCustomer(customer.id) before returning error
  (mirrors voidAuthorizeTransaction on failure in commonServerFunction.js)
```

Add CORS headers (same pattern as `/api/paymentPortal`).

---

## Step 7: Create `app/api/stripe/webhook/route.js`

**Critical:** Must use `request.text()` (not `.json()`) for Stripe signature verification.

```js
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripeServerFunction';
import {
    getUserSettingByStripeSubscriptionId,
    updateUserSettingStatus,
    updateUserSettingData
} from '@/lib/userSettings';
import { sendSubsCancelledEmailSG } from '@/lib/sendgrid';

export async function POST(request) {
    const sig = request.headers.get('stripe-signature');
    const body = await request.text();

    let event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const subscriptionId = event.data.object.subscription ?? event.data.object.id;
    const userSetting = await getUserSettingByStripeSubscriptionId(subscriptionId);
    if (!userSetting) return NextResponse.json({ received: true }, { status: 200 });

    const currentData = JSON.parse(userSetting.data ?? '{}');

    switch (event.type) {
        case 'invoice.payment_succeeded':
            const periodEnd = new Date(event.data.object.period_end * 1000);
            await updateUserSettingData(userSetting, JSON.stringify({
                ...currentData, renewaldate: periodEnd.toISOString(), status: 'active'
            }));
            break;

        case 'customer.subscription.deleted':
            if (userSetting.status !== 'cancelled') {  // idempotency guard
                await updateUserSettingStatus(userSetting, 'cancelled',
                    JSON.stringify({ ...currentData, status: 'cancelled' }));
                const email = currentData?.email;
                if (email) await sendSubsCancelledEmailSG(email);
            }
            break;

        case 'invoice.payment_failed':
            await updateUserSettingStatus(userSetting, 'inactive',
                JSON.stringify({ ...currentData, status: 'inactive' }));
            break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
}
```

No CORS headers needed — this endpoint is only called by Stripe servers.

---

## Step 8: Rewrite `components/PaymentPortal.js`

Remove entirely: Auth.net imports, `window.responseHandler`, `formRef`, AcceptUI button, `getAndUseInfoFrompaymentForm` call, hidden form inputs.

Add: `useStripe`, `useElements`, `CardElement` from `@stripe/react-stripe-js`.

**New submit flow (replaces `responseHandler`):**
```js
const handleSubmit = async () => {
    // 1. Read DOM values (same pattern as getAndUseInfoFrompaymentForm — preserves Forms.js independence)
    const email = document.querySelector('#email')?.value;
    const phone = document.querySelector('#phone')?.value;
    const password = document.querySelector('#password')?.value;
    const country = document.querySelector('#search_country')?.value;

    // 2. Tokenize card
    const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: { email, phone }
    });
    if (pmError) { /* setError */ return; }

    // 3. Call new backend
    const result = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: paymentMethod.id, email, phone, country, password, amount, term, trial })
    }).then(r => r.json());

    // 4. Handle requires_action (3DS — rare for trial)
    if (result.requiresAction) {
        const { error } = await stripe.confirmCardPayment(result.clientSecret);
        if (error) { /* setError */ return; }
    }

    // 5. Success — same redirect logic as current PaymentPortal (lines 91-97)
    const parsed = JSON.parse(result.data);
    const user = await storeInLocalStorage(parsed);
    router.push(`https://my.gymnasticbodies.com/?authToken=${user.token}&...`);
};
```

Render: Replace the AcceptUI `<form>` with `<CardElement>` + a plain MUI `<Button onClick={handleSubmit}>`.

Keep: `storeInLocalStorage` import, `useSearchParams` for amount/term/trial, error/success Alert, CircularIndeterminate spinner, same visual layout.

---

## Step 9: Update `app/checkout/page.js`

**Remove** line 155:
```jsx
<Script src="https://js.authorize.net/v3/AcceptUI.js" strategy="afterInteractive" />
```

**Add** at module scope (outside component, to avoid re-creation):
```js
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
```

**Wrap** the existing PaymentPortal with Elements:
```jsx
<Elements stripe={stripePromise}>
    <Suspense>
        <PaymentPortal data={props?.data} userData={props?.userData} />
    </Suspense>
</Elements>
```

---

## Step 10: Guard Cron Job in `app/api/cronJobs/route.js`

Inside the renewal loop, add a skip guard before the Auth.net calls:

```js
// Stripe subscriptions are managed entirely by Stripe webhooks
if (userSetting.stripeSubscriptionId) {
    console.log('Skipping Stripe-managed user:', email);
    continue;
}
```

Note: `getAllAuthUserSettings()` already filters `WHERE woocommerce_authorize_import = true` (line 172 of `userSettings.js`), so new Stripe users (who'll have this as `null`) are already excluded from the cron query. The guard above is a belt-and-suspenders safety for any edge cases.

---

## Implementation Order

1. Schema migration (Step 3) — safe first, additive-only
2. `lib/userSettings.js` updates (Step 4)
3. `lib/stripeServerFunction.js` (Step 5)
4. `app/api/stripe/create-subscription/route.js` (Step 6)
5. `app/api/stripe/webhook/route.js` (Step 7)
6. Stripe Dashboard: product + price + webhook + copy IDs to env vars (Step 2)
7. Rewrite `components/PaymentPortal.js` (Step 8)
8. Update `app/checkout/page.js` (Step 9)
9. Cron guard (Step 10)
10. Test with Stripe test keys, then flip to live keys

---

## Verification

**Schema:**
- [ ] Migration SQL shows only 2 `ADD COLUMN` statements, no drops
- [ ] Neon console shows new columns on `user_setting`; existing rows show `NULL`

**Happy path (test card `4242 4242 4242 4242`, any future expiry):**
- [ ] `/subscribe` → click "Start For Free" → lands on `/checkout?amount=75&term=monthly&trial=true`
- [ ] No `authorize.net` script tag in page source
- [ ] Stripe CardElement renders in the form
- [ ] Fill all fields + card → click submit → loading spinner shows
- [ ] Neon: new `user` row + `user_setting` row with `stripeCustomerId` and `stripeSubscriptionId` populated
- [ ] SendGrid: welcome email received
- [ ] Redirect to `https://my.gymnasticbodies.com/?authToken=...` with all params
- [ ] `localStorage.user` contains token on the my.gymnasticbodies.com side

**Error paths:**
- [ ] Declined card (`4000 0000 0000 0002`) → inline error Alert, no redirect
- [ ] Duplicate email → inline "Already subscribed" message

**Webhook (use `stripe listen --forward-to localhost:3000/api/stripe/webhook`):**
- [ ] `invoice.payment_succeeded` → `renewaldate` updated in DB
- [ ] `customer.subscription.deleted` → status = 'cancelled', cancellation email sent
- [ ] Replay same event → no duplicate email (idempotency check)

**Cron:**
- [ ] Stripe users skipped in cron loop
- [ ] Existing Auth.net users (`woocommerceAuthorizeImport: true`) still processed normally
