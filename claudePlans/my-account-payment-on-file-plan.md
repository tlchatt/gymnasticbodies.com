# My Account — "Payment on file" for DB-only `current` users (104 WooCommerce victims)

**Status:** PLAN ONLY — no code written. Read-only investigation complete 2026-07-24.
**Scope:** `app.gymnasticbodies.com` (`/accountDetails`). JavaScript / Next.js App Router.

## Who this is for

The ~104 legacy WooCommerce customers (Thomas Fechner + 103 others, log:
`claudePlans/wc-victim-bulk-fix-log-2026-07-23.json`, audit:
`claudePlans/wc-migration-billing-audit-2026-07-23.md`) that were manually un-paywalled by writing:

- `user_setting` (`type = 'subscription'`), inside the `data` TEXT-JSON: `renewaldate` = future ISO date, `status = 'active'`.
- `user` table: `migration_type = 'current'`, `customer_segment = 'subscriber'`.

They have **no Stripe subscription** (`stripe_subscription_id` null), **no Stripe customer**, **no Authorize.net** subscription. They classify via the `subscriber` branch of `/api/classifyUsers` (`app/api/classifyUsers/route.js:194` — `else if (u._renewalDate && u._renewalDate > now)`).

---

## 1. Root cause of the blank "Manage Subscription" section

**Two-layer cause, both in the DB-only path.**

### Primary: `hasSubscription`/`status` read the top-level column, but the fix only wrote `data.status`

`getAccountInformation()` (`lib/commonFunctions.js:717`) builds `dbImpInfo` (`lib/commonFunctions.js:733-759`) from the DB. Two fields come from the **top-level `user_setting.status` column**, not from the `data` JSON:

- `status` — `lib/commonFunctions.js:740-742`: `usersettingInfo.status ? capitalize(...) : 'N/A'`
- `hasSubscription` — `lib/commonFunctions.js:749`: `activeStatuses.includes(usersettingInfo.status)` where `activeStatuses = ['active','trialing','Active']` (`lib/commonFunctions.js:731`)

The manual fix wrote `status: 'active'` **inside the `data` JSON blob** (`user_setting.data`, a TEXT column — schema `Drizzle/db/schema.ts:46`), and left the top-level `status` column (`Drizzle/db/schema.ts:41`) untouched (null / old `inactive`/`expired`). So for these users:

- `usersettingInfo.status` (column) is falsy/stale → `dbImpInfo.status = 'N/A'` and **`hasSubscription = false`**.

The component then renders the *absent* branch:

- `components/AccountDetailsComp.js:133` — `<Content content={impInfo?.hasSubscription ? presentContent : absentContent} />`
- `absentContent = [{ 'No Subscription': 'N/A' }]` (`components/AccountDetailsComp.js:95`)

That is the blank section: the renewal date, plan, amount, term, next-payment, and payment-method rows in `presentContent` (`components/AccountDetailsComp.js:86-94`) are never rendered because `hasSubscription` is false. Note the renewal date **is already computed correctly** at `lib/commonFunctions.js:746` (`redableNextPaymentDate: getDateString(data?.renewaldate)`) — it just never reaches the screen.

### Secondary: no gateway subscription to enrich card details

Neither enrichment path runs for these users:

- Stripe enrichment is gated on `if (usersettingInfo.stripeSubscriptionId)` (`lib/commonFunctions.js:766`) → skipped (null).
- Authorize.net enrichment is gated on a resolved `authorizeCustomerId` (`lib/commonFunctions.js:808-813`) → skipped.

So the function falls to the DB-only return (`lib/commonFunctions.js:836-845`) with `cardType = 'N/A'`, `cardNumber = 'N/A'`. Even once `hasSubscription` is fixed, the Payment Method row (`components/AccountDetailsComp.js:93`) will read `'No payment info on file'` and there is **no UI to add a card**.

`migrationStatus` is returned correctly as `'current'` in that DB-only return (`lib/commonFunctions.js:843`), so the component's `isActive` check will pass once `status` renders as `'Active'`.

### Minimal change to make renewal date + "no payment saved" render

In `getAccountInformation()` `dbImpInfo` (`lib/commonFunctions.js:733-759`), prefer the `data` JSON when the column is empty and derive `hasSubscription` from a valid future renewal date, not solely the column:

- `status`: `usersettingInfo.status || data?.status` (then capitalize), so `data.status='active'` surfaces.
- Add a computed `const hasFutureRenewal = data?.renewaldate is a string matching /^\d{4}-\d{2}-\d{2}/ and new Date(data.renewaldate) > now` (reuse the exact guard from `app/api/classifyUsers/route.js:9-18` `parseRenewalDate`).
- `hasSubscription`: `activeStatuses.includes(usersettingInfo.status) || activeStatuses.includes(data?.status) || hasFutureRenewal`.
- Surface any saved card metadata (see §4) so the Payment Method row shows the saved card once one exists: in the DB-only return (`lib/commonFunctions.js:836-845`), set `cardType`/`cardNumber` from `data.cardBrand`/`data.cardLast4` when present, else `'N/A'`.
- Also pass through `paymentMethodId: data?.paymentMethodId ?? null` and `stripeCustomerId: usersettingInfo.stripeCustomerId ?? data?.stripeCustomerId ?? null` on `impInfo` so the component can decide "Add" vs "Update payment method".

Optional belt-and-suspenders (not required if the above ships): when saving a card (§3) also normalize the top-level `status` column to `'active'` so the mismatch is healed at the source. Keep the read-side fix regardless — it is what makes the existing 104 rows render without a data backfill.

This is a **pure read-shape change** (plus the new fields) — it does not alter classification and cannot re-trigger the paywall.

---

## 2. New Stripe helpers (`lib/stripeServerFunction.js`)

No SetupIntent / save-card / customer-only route exists today (confirmed: `app/api/stripe/` has only `cancel-subscription`, `create-subscription`, `offer-subscription`, `renew-subscription`, `webhook`; grep for `setupIntent`/`save-payment` returns nothing). Reuse what's there and add one helper.

Existing, reusable:
- `createStripeCustomer(email, name, phone, country)` — `lib/stripeServerFunction.js:5-7`
- `attachPaymentMethod(paymentMethodId, customerId)` — attaches **and** sets `invoice_settings.default_payment_method` — `lib/stripeServerFunction.js:9-14`
- `stripe` instance export — `lib/stripeServerFunction.js:3,53`

Add:
```js
export async function createSetupIntent(customerId) {
    return stripe.setupIntents.create({
        customer: customerId,
        usage: 'off_session',
        payment_method_types: ['card'],
    });
}
```

---

## 3. New API routes

Both are same-origin calls from `AccountDetailsComp` (page served on `app.` origin). Add CORS headers + an `OPTIONS`/`GET` handler for parity with the other Stripe routes (e.g. `app/api/stripe/renew-subscription/route.js:142-151`). Accept `userId` (the page already has it, `app/accountDetails/page.js:8`); optionally verify `token` against the `session` table for security (existing `/api/user/*` routes key off `userId` only — match that baseline, note the gap).

### 3a. `POST /api/stripe/setup-intent`  (`app/api/stripe/setup-intent/route.js`)

Purpose: get-or-create the Stripe customer and hand the client a SetupIntent `client_secret`.

Request:
```json
{ "userId": "<neon-user-id>" }
```
Server steps:
1. `const user = await getUserWithId(userId)` (`lib/userSettings.js:27`); 404 if missing.
2. `const setting = await queryUserSetting(userId, 'subscription')` (`lib/userSettings.js:8`).
3. `const data = JSON.parse(setting?.data ?? '{}')` (TEXT-JSON — parse, never `->>`).
4. Resolve customer id: `let customerId = setting?.stripeCustomerId ?? data?.stripeCustomerId ?? null`.
5. If none: `customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { country: data.country ?? '' } }, { idempotencyKey: 'customer-' + user.email })` (mirrors `app/api/stripe/create-subscription/route.js:44-48`), `customerId = customer.id`. Persist immediately (write the column via a small update helper — see §4) so a retry reuses it.
6. `const si = await createSetupIntent(customerId)`.
7. Return `{ clientSecret: si.client_secret, customerId }`.

Response:
```json
{ "clientSecret": "seti_..._secret_...", "customerId": "cus_..." }
```

### 3b. `POST /api/stripe/save-payment-method`  (`app/api/stripe/save-payment-method/route.js`)

Purpose: after the client confirms the SetupIntent, persist the card as the customer default and store the ids/metadata. (Confirming a SetupIntent already attaches the PM to the customer; `attach` below is idempotent belt-and-suspenders.)

Request:
```json
{ "userId": "<neon-user-id>", "paymentMethodId": "pm_..." }
```
Server steps:
1. Load `user`, `setting`, `data` (as in 3a). Resolve `customerId` (must exist from 3a; 400 if not).
2. `await attachPaymentMethod(paymentMethodId, customerId)` (`lib/stripeServerFunction.js:9-14`) → attaches + `customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } })`. Wrap the attach in try/catch to ignore "already attached".
3. `const pm = await stripe.paymentMethods.retrieve(paymentMethodId)` → `pm.card.brand`, `pm.card.last4`.
4. Persist (see §4): column `stripe_customer_id = customerId`; and merge into `data` TEXT-JSON: `paymentMethodId`, `cardBrand: pm.card.brand`, `cardLast4: pm.card.last4`, `paymentMethodAddedAt: new Date().toISOString()`. **Do not touch** `migration_type`, `customer_segment`, or `stripe_subscription_id`.
5. Return `{ success: true, cardBrand, cardLast4 }`.

Response:
```json
{ "success": true, "cardBrand": "visa", "cardLast4": "4242" }
```

Stripe SDK calls used across both routes: `customers.create`, `setupIntents.create({ customer, usage:'off_session' })`, `paymentMethods.attach`, `customers.update({ invoice_settings: { default_payment_method } })`, `paymentMethods.retrieve`.

---

## 4. Where to store the ids (storage decision)

**Recommendation (hybrid):**

- **`stripeCustomerId` → the existing dedicated column `user_setting.stripe_customer_id`** (`Drizzle/db/schema.ts:54`). It already exists, and `updateUserSetting` (`lib/userSettings.js:103-114`) and `updateUserSettingRenewal` (`lib/userSettings.js:203-219`) already write it; the renew/offer/create routes already read `setting.stripeCustomerId` to reuse a customer (`app/api/stripe/renew-subscription/route.js:62`). Storing it here means the future expiry-charge cron reuses the exact same field as everything else.
- **`paymentMethodId`, `cardBrand`, `cardLast4`, `paymentMethodAddedAt` → inside the `user_setting.data` TEXT-JSON.** There is no column for a payment-method id, and these are display/charge metadata that belong with the rest of `data`. Parse → merge → stringify.

Add one tiny helper to `lib/userSettings.js` (there isn't a clean "set customer id + data only" writer — `updateUserSetting` at `lib/userSettings.js:103-114` also overwrites `status`/`stripeSubscriptionId`, which we must not touch):
```js
export async function updateUserSettingPaymentMethod(matching, { stripeCustomerId, data }) {
    return db.update(user_setting)
        .set({ stripeCustomerId, data })   // data = JSON.stringify(mergedData)
        .where(eq(user_setting.id, matching.id)).returning();
}
```

**Classifier safety (must NOT flip them off `current`):** the `/api/classifyUsers` SQL selects only `stripe_subscription_id`, `authorize_subscription_id`, `status`, `data` (`app/api/classifyUsers/route.js:80-96`) — it does **not** select `stripe_customer_id`. The live-Stripe recheck branch is gated on `if (u.stripe_subscription_id)` (`app/api/classifyUsers/route.js:118`). Because we write only the **customer** id (never a subscription id), these users skip that branch entirely and keep classifying via the `subscriber` branch (`app/api/classifyUsers/route.js:194`) as long as `data.renewaldate` stays in the future. Saving a card is therefore inert to classification. (Storing the customer id in `data` instead of the column would be equally classifier-safe, but loses reuse-by-helpers — hence the column is preferred.)

---

## 5. Frontend — `components/AccountDetailsComp.js`

`app/accountDetails/page.js` is an **async server component** (`app/accountDetails/page.js:5`) that fetches server-side and passes `data`/`userId`/`token` as props (`app/accountDetails/page.js:12-37`). `AccountDetailsComp` is `'use client'` (`components/AccountDetailsComp.js:1`) but is still **SSR-hydrated** (it is not `dynamic(ssr:false)`). Stripe Elements rendered during SSR previously caused React #418 on `/renew` (fixed there by `dynamic(..., { ssr:false })` — see `app/renew/RenewClient.js:11`). We must not reintroduce that.

### New "Payment Method" subsection (inside `DisplaySubscription`, `components/AccountDetailsComp.js:30`)

Render below the existing subscription content:
- If `impInfo?.paymentMethodId` (or `cardType !== 'N/A'`): show `"{cardBrand} ending in {cardLast4}"` + an **"Update payment method"** button.
- Else: show **"No payment method saved"** + an **"Add payment method"** button.
- Clicking sets a `showAddCard` state true and renders the isolated Stripe form (below).

### Isolated card form — new file `components/AddPaymentMethod.js` (`'use client'`), loaded SSR-off

Mount it only when `showAddCard` is true, via:
```js
const AddPaymentMethod = dynamic(() => import('@/components/AddPaymentMethod'), { ssr: false });
```
`AddPaymentMethod` owns its own `<Elements stripe={stripePromise}>` provider (pattern from `app/renew/RenewClient.js:13,30`; `stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)`), a `CardElement` (reuse the dark `cardElementOptions` style from `components/RenewalPortal.js:222-232`), and does:
1. On mount, `POST /api/stripe/setup-intent { userId }` → get `clientSecret`.
2. On submit, `stripe.confirmCardSetup(clientSecret, { payment_method: { card: elements.getElement(CardElement), billing_details: { email } } })` (handles 3DS automatically).
3. On success, `POST /api/stripe/save-payment-method { userId, paymentMethodId: setupIntent.payment_method }`.
4. Lift the saved `{ cardBrand, cardLast4 }` up via a callback prop so the parent swaps to the saved-card display without a full reload.

### React hooks introduced — **REQUIRES OWNER SIGN-OFF** (per global rule "Always discuss React Hook Usage with me")

In `DisplaySubscription` (`components/AccountDetailsComp.js:30`) — additions, all `useState` (already used throughout this file, e.g. `components/AccountDetailsComp.js:33-37`):
- `useState` — `showAddCard` (toggle)
- `useState` — `savedCard` (`{ cardBrand, cardLast4 }` after save, to re-render without reload)

In the new `components/AddPaymentMethod.js`:
- `useStripe()` — Stripe hook
- `useElements()` — Stripe hook
- `useState` — `clientSecret`, `loading`, `error`, `message`
- `useEffect` — fetch the SetupIntent `clientSecret` once on mount (guard on `userId`)
- `useRef` — `submittingRef` double-submit guard (mirrors `components/RenewalPortal.js:40,103-104`)

No new hooks in the server page (`app/accountDetails/page.js`) — it stays a server component.

---

## 6. Expiry-charge path (DESIGN ONLY — follow-up, do not build now)

Goal: when a saved-card user's `data.renewaldate` approaches, charge the saved card off-session to keep them `current`.

- **There is no `/api/cronJobs` route** — the `app.../CLAUDE.md` reference is stale. Current crons (`vercel.json:3-20`): `/api/classifyUsers` (11:00), `/api/admin/gmail/sync` (hourly), `/api/cronRenewalOutreach` (14:00), `/api/cronMarketingDrip` (23:00). Add a new `/api/cronChargeExpiring/route.js` and a `vercel.json` cron entry.
- **Selection:** `user_setting` rows (`type='subscription'`) where `data.paymentMethodId` is set, `stripe_subscription_id` is null, and `data.renewaldate` is within N days of now (parse `data` in JS, not `->>`, TEXT-JSON).
- **Charge:** preferred — create a real subscription so future renewals become automatic and fold into the existing webhook + classifier flow: reuse `createStripeSubscriptionWithPriceData(customerId, { amountCents, currency:'usd', interval, intervalCount })` (`lib/stripeServerFunction.js:33-51`) with the customer's default PM (already set in §3b), or a one-off `stripe.paymentIntents.create({ customer, payment_method, amount, currency, off_session: true, confirm: true })`. On success, write `stripe_subscription_id` + updated `renewaldate` and `updateUserClassification(userId, 'current', 'stripe')` (`lib/userSettings.js:225`) — after which the classifier's live-Stripe recheck (`app/api/classifyUsers/route.js:118`) governs them.
- **Idempotency (avoid double-charge):** skip any row that already has `stripe_subscription_id`, or whose `renewaldate` has already been advanced, or that was charged this cycle (record an attempt marker in `data`). Mirror the existing idempotency guards in `app/api/stripe/renew-subscription/route.js:46-59`.
- **Auth:** existing cron routes do **not** verify `CRON_SECRET` (grep found no check in `cronRenewalOutreach`/`cronMarketingDrip`/`classifyUsers`). Recommend adding an `x-cron-secret` check (env var already documented) to the new charge cron since it moves money.

---

## 7. Risks / edge cases

- **Stripe test vs live key.** The SetupIntent is created with whatever `STRIPE_SECRET_KEY` is in env; the client confirm uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. They must be the same mode. Per project memory the standing rule is to keep `sk_live_*` in `.env.local` on dev — so cards saved during dev testing create **live** Stripe customers/PMs. Test with a real card or a dedicated test account, and be deliberate about which key is active.
- **`user_setting.data` is TEXT holding JSON (`Drizzle/db/schema.ts:46`), not jsonb.** Always `JSON.parse(setting.data ?? '{}')` inside try/catch, merge, `JSON.stringify`. Never use `->>`, `DISTINCT`, or `LOWER()` on it in parameterized neon queries (documented failure mode). Follow the `parseRenewalDate` guard (`app/api/classifyUsers/route.js:9-18`).
- **SSR Stripe Elements / React #418.** Do not add `<Elements>` at the top of the SSR-hydrated `AccountDetailsComp`. Isolate it in `components/AddPaymentMethod.js` loaded with `dynamic(..., { ssr:false })` and mounted only after the "Add payment method" click (pattern: `app/renew/RenewClient.js:11`).
- **Do not re-trigger the paywall / do not double-classify.** Saving a card writes only the customer id (column) + `data` metadata — never `stripe_subscription_id`, never `status`/`migration_type`/`customer_segment` changes. Confirmed classifier ignores `stripe_customer_id` (§4).
- **No charge on save.** SetupIntent (`usage:'off_session'`) authorizes a future charge; it does not move money. The only charge happens later in the expiry cron, which must be idempotent (§6).
- **3DS.** `confirmCardSetup` handles authentication at save time. Some cards still fail 3DS when charged `off_session` later — the expiry cron must handle `authentication_required` (fall back to emailing a `/renew` link).
- **CORS.** Same-origin in practice (page on `app.` calls `app.` routes), but add the standard CORS + `OPTIONS`/`GET` handlers for parity (`app/api/stripe/renew-subscription/route.js:142-151`).
- **Token/identity.** New routes key off `userId` like the other `/api/user/*` routes; consider validating the `session` token (`app/accountDetails/page.js:7`) before mutating billing data.

---

## Summary of deliverables

**Files to change**
1. `lib/commonFunctions.js` — root-cause read fix in `getAccountInformation` `dbImpInfo` (`:733-759`, esp. `:740-742,:749`) + surface saved-card + customer/PM ids in the DB-only return (`:836-845`).
2. `lib/stripeServerFunction.js` — add `createSetupIntent(customerId)`.
3. `lib/userSettings.js` — add `updateUserSettingPaymentMethod(matching, { stripeCustomerId, data })`.
4. `components/AccountDetailsComp.js` — new "Payment Method" subsection in `DisplaySubscription` (`:30`); `dynamic(ssr:false)` mount of the card form.

**Files to create**
5. `app/api/stripe/setup-intent/route.js` — `POST` get/create customer + SetupIntent.
6. `app/api/stripe/save-payment-method/route.js` — `POST` attach + set default + persist ids.
7. `components/AddPaymentMethod.js` — `'use client'`, own `<Elements>`, `CardElement`, confirm SetupIntent.
8. (follow-up) `app/api/cronChargeExpiring/route.js` + `vercel.json` cron entry.

**Hooks introduced (need sign-off):** `AccountDetailsComp` — 2× `useState`. `AddPaymentMethod` — `useStripe`, `useElements`, `useState`, `useEffect`, `useRef`.

**Storage decision:** `stripeCustomerId` → existing column `user_setting.stripe_customer_id`; `paymentMethodId` + `cardBrand`/`cardLast4`/`paymentMethodAddedAt` → `user_setting.data` TEXT-JSON. Never write `stripe_subscription_id` on save (that is the only thing that would arm the classifier's live-Stripe recheck).
