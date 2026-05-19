# Plan: Replace Authorize.net Checkout with Stripe

## Status: COMPLETE (test mode verified 2026-05-18)

**Verified working:**
- New signups go through Stripe (7-day trial, $75/month)
- User + subscription created in Neon on checkout
- Redirect to `my.gymnasticbodies.com` with auth token
- Webhooks handle renewals, cancellations, and payment failures
- Existing Auth.net users untouched

**To go live:**
1. Swap the four env vars in Vercel to live keys (`sk_live_`, `pk_live_`, live `price_`, live `whsec_`)
2. Register webhook endpoint in Stripe Dashboard (live mode) → `https://app.gymnasticbodies.com/api/stripe/webhook` → events: `invoice.payment_succeeded`, `customer.subscription.deleted`, `invoice.payment_failed`
3. Deploy

**Future work:** Paywall/renewal flow for existing Auth.net users whose subscriptions lapse.

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

Add to `.env.local` and Vercel dashboard (all environments):

```
STRIPE_SECRET_KEY=sk_live_...          # server-only
STRIPE_WEBHOOK_SECRET=whsec_...        # server-only
STRIPE_PRICE_ID=price_...             # server-only (monthly $75 Price object ID)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  # client-safe
```

**Stripe Dashboard pre-work** (before deploy):
1. Create Product: "GymFit TV Subscription"
2. Create Price: $75.00 USD / month recurring → copy `price_xxx` into `STRIPE_PRICE_ID`
3. Create Webhook endpoint at `https://app.gymnasticbodies.com/api/stripe/webhook` subscribing to:
   - `invoice.payment_succeeded`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy webhook signing secret into `STRIPE_WEBHOOK_SECRET`

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
    stripeCustomerId: settingsRecord?.stripeCustomerId,
    stripeSubscriptionId: settingsRecord?.stripeSubscriptionId,
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
