# Plan: Testing & Logging — Stripe Signup + Renewal Flow

## Status: ACTIVE

**Scope:** End-to-end testing and structured logging for:
1. New-user signup via Stripe (`/api/stripe/create-subscription`)
2. Lapsed-user renewal via Stripe (`/api/stripe/renew-subscription`)
3. Renewal paywall redirect check (`/api/user/renewalStatus`)
4. Stripe webhook lifecycle events (`/api/stripe/webhook`)

---

## Part 1: Logging

### Goal

Replace ad-hoc `console.error(...)` calls with structured, machine-readable log lines. Every key event in the payment flows should emit a consistent JSON log so Vercel's log viewer (and any future log drain) can be filtered and searched.

### 1a. Environment variables

Two env vars control logging behaviour. Add both to `.env.local` and to Vercel project settings.

```
# Master on/off switch. Set to 'false' to silence all payment logs.
# Default: true (logging on)
LOG_ENABLED=true

# Minimum severity to emit. One of: debug | info | warn | error
# Default: info  (debug lines are suppressed unless explicitly enabled)
LOG_LEVEL=info
```

In Vercel:
- **Production:** `LOG_ENABLED=true`, `LOG_LEVEL=info`
- **Preview:** `LOG_ENABLED=true`, `LOG_LEVEL=debug` (verbose during QA)
- **To silence entirely:** set `LOG_ENABLED=false` on any environment

### 1b. Create `lib/logger.js`

A thin wrapper — no external dependency. Writes one JSON line to stdout per call, which Vercel picks up as a function log.

```js
// lib/logger.js

const ENABLED = process.env.LOG_ENABLED !== 'false';
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, event, data = {}) {
    if (!ENABLED) return;
    if (LEVELS[level] < MIN_LEVEL) return;
    const entry = {
        ts: new Date().toISOString(),
        level,
        event,
        ...data,
    };
    // Errors: capture message + stack separately, don't let them serialize as {}
    if (data.error instanceof Error) {
        entry.error = { message: data.error.message, stack: data.error.stack };
    }
    console.log(JSON.stringify(entry));
}

export const logger = {
    info:  (event, data) => log('info',  event, data),
    warn:  (event, data) => log('warn',  event, data),
    error: (event, data) => log('error', event, data),
};
```

`LOG_ENABLED=false` short-circuits before any string building, so there's no performance cost when logging is off.

### 1c. Event taxonomy

| Event name | Route | Level | Key fields |
|---|---|---|---|
| `signup.attempt` | create-subscription | info | email, trial, term, amount |
| `signup.success` | create-subscription | info | email, stripeCustomerId, stripeSubscriptionId, userId |
| `signup.failed` | create-subscription | error | email, error |
| `signup.duplicate` | create-subscription | warn | email |
| `renewal.attempt` | renew-subscription | info | email, price, term |
| `renewal.success` | renew-subscription | info | email, stripeCustomerId, stripeSubscriptionId, userId |
| `renewal.failed` | renew-subscription | error | email, error |
| `renewal.3ds_required` | renew-subscription | info | email, subscriptionId |
| `renewalStatus.check` | renewalStatus | info | email, needsRenewal, migrationType |
| `renewalStatus.error` | renewalStatus | error | email, error |
| `webhook.received` | webhook | info | eventType, subscriptionId |
| `webhook.processed` | webhook | info | eventType, subscriptionId, userId |
| `webhook.sig_failed` | webhook | error | error |
| `webhook.handler_error` | webhook | error | eventType, error |
| `webhook.unmatched` | webhook | warn | subscriptionId |

### 1d. Wire into each route

**`app/api/stripe/create-subscription/route.js`** — add at key decision points:

```js
import { logger } from '@/lib/logger';

// top of try block, after parsing body:
logger.info('signup.attempt', { email, trial: trialDays > 0, term, amount });

// after stripeSubscriptionId check:
logger.warn('signup.duplicate', { email });

// after return NextResponse success:
logger.info('signup.success', {
    email,
    stripeCustomerId: customer.id,
    stripeSubscriptionId: subscription.id,
    userId: dbUser?.user?.id,
});

// in catch:
logger.error('signup.failed', { email: json?.email, error });
```

**`app/api/stripe/renew-subscription/route.js`** — same pattern:

```js
logger.info('renewal.attempt', { email, price: rawPrice, term: rawTerm });
logger.info('renewal.success', { email, stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, userId: user.id });
logger.info('renewal.3ds_required', { email, subscriptionId: subscription.id });
logger.error('renewal.failed', { email, error });
```

**`app/api/user/renewalStatus/route.js`**:

```js
logger.info('renewalStatus.check', { email, needsRenewal, migrationType: user.migrationType });
logger.error('renewalStatus.error', { email, error: err });
```

**`app/api/stripe/webhook/route.js`**:

```js
const subscriptionId = event.data.object.subscription ?? event.data.object.id;
logger.info('webhook.received', { eventType: event.type, subscriptionId });

// after userSetting not found:
logger.warn('webhook.unmatched', { eventType: event.type, subscriptionId });

// after each switch case:
logger.info('webhook.processed', { eventType: event.type, subscriptionId, settingId: userSetting.id });

// in outer catch:
logger.error('webhook.handler_error', { eventType: event.type, error: err });

// signature fail:
logger.error('webhook.sig_failed', { error: err });
```

---

## Part 2: Testing

### Pre-requisites

1. Dev server running: `npm run dev` (port 3000)
2. Stripe CLI installed: `stripe --version`
3. Webhook forwarding running in a separate terminal:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_...` output → set in `.env.local` as `STRIPE_WEBHOOK_SECRET`
4. Test mode env vars active (keys start with `sk_test_` / `pk_test_`)

### Test cards (Stripe test mode)

| Card number | Behavior |
|---|---|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0000 0000 0002` | Always declines (insufficient_funds) |
| `4000 0025 0000 3155` | Requires 3DS authentication |
| Any future expiry, any 3-digit CVV, any ZIP | Valid for all test cards |

### Test scripts

All scripts live in `claudePlans/` and are run with `node claudePlans/<name>.js`.

---

#### `claudePlans/test-stripe-signup.js`

Tests `POST /api/stripe/create-subscription` against localhost using a real Stripe test `paymentMethodId`.

```js
// claudePlans/test-stripe-signup.js
// Pre-req: dev server on :3000, test mode Stripe keys in .env.local
// Run: node claudePlans/test-stripe-signup.js

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE = 'http://localhost:3000';

async function createTestPaymentMethod() {
    const pm = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' }, // test token, always succeeds
    });
    return pm.id;
}

async function run() {
    const testEmail = `test-signup-${Date.now()}@example.com`;
    console.log('\n=== Stripe Signup Tests ===\n');

    // Happy path
    console.log('1. Happy path — new user, 7-day trial...');
    const pmId = await createTestPaymentMethod();
    const res = await fetch(`${BASE}/api/stripe/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentMethodId: pmId,
            email: testEmail,
            phone: '555-1234',
            country: 'US',
            password: 'TestPass123!',
            amount: '75',
            term: 'monthly',
            trial: true,
        }),
    });
    const data = await res.json();
    check('status 200', res.status === 200);
    check('subscriptionCreated: true', data.subscriptionCreated === true);
    check('has data field', !!data.data);
    const parsed = JSON.parse(data.data);
    check('has token', !!parsed.token);
    check('email matches', parsed.email === testEmail);
    console.log('   stripeSubscriptionId:', JSON.parse(data.data)?.userInNeon?.setting?.stripeSubscriptionId ?? '(check DB)');

    // Duplicate email
    console.log('\n2. Duplicate email — should return existingCustomer: true...');
    const pm2 = await createTestPaymentMethod();
    const res2 = await fetch(`${BASE}/api/stripe/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentMethodId: pm2,
            email: testEmail,
            phone: '555-1234',
            country: 'US',
            password: 'TestPass123!',
            amount: '75',
            term: 'monthly',
            trial: true,
        }),
    });
    const data2 = await res2.json();
    check('existingCustomer: true', data2.existingCustomer === true);
    check('transaction: false', data2.transaction === false);

    console.log('\n=== Done ===\n');
}

function check(label, pass) {
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
}

run().catch(err => { console.error(err); process.exit(1); });
```

---

#### `claudePlans/test-stripe-renewal.js`

Tests the renewal flow against a known `active_expired` test user.

```js
// claudePlans/test-stripe-renewal.js
// Pre-req: dev server on :3000, a known active_expired user in Neon (see test-users.json)
// Run: node claudePlans/test-stripe-renewal.js

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const BASE = 'http://localhost:3000';

// Use a known active_expired user from claudePlans/test-users.json
// EDIT THESE before running:
const TEST_EMAIL = 'REPLACE_WITH_ACTIVE_EXPIRED_EMAIL';

async function createTestPaymentMethod() {
    const pm = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_visa' },
    });
    return pm.id;
}

async function run() {
    console.log('\n=== Stripe Renewal Tests ===\n');

    // Step 1: Check renewalStatus
    console.log('1. renewalStatus — should return needsRenewal: true...');
    const statusRes = await fetch(`${BASE}/api/user/renewalStatus?email=${encodeURIComponent(TEST_EMAIL)}`);
    const status = await statusRes.json();
    check('status 200', statusRes.status === 200);
    check('needsRenewal: true', status.needsRenewal === true);
    check('has price', !!status.price);
    check('has term', !!status.term);
    console.log(`   price: ${status.price}, term: ${status.term}`);

    // Step 2: Submit renewal with test card
    console.log('\n2. Happy path renewal — test visa card...');
    const pmId = await createTestPaymentMethod();
    const renewRes = await fetch(`${BASE}/api/stripe/renew-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentMethodId: pmId,
            email: TEST_EMAIL,
            price: status.price,
            term: status.term,
        }),
    });
    const renewData = await renewRes.json();
    check('status 200', renewRes.status === 200);
    check('success: true', renewData.success === true);
    check('has token', !!renewData.token);
    check('has userId', !!renewData.userId);
    console.log(`   subscriptionId: will appear in Stripe test dashboard`);

    // Step 3: Re-check renewalStatus — should now be false
    console.log('\n3. renewalStatus after renewal — should return needsRenewal: false...');
    const statusRes2 = await fetch(`${BASE}/api/user/renewalStatus?email=${encodeURIComponent(TEST_EMAIL)}`);
    const status2 = await statusRes2.json();
    check('needsRenewal: false', status2.needsRenewal === false);

    // Step 4: Declined card
    console.log('\n4. Declined card — should return error, not crash...');
    const pmDeclined = await stripe.paymentMethods.create({
        type: 'card',
        card: { token: 'tok_chargeDeclined' },
    });
    const declinedRes = await fetch(`${BASE}/api/stripe/renew-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentMethodId: pmDeclined.id,
            email: TEST_EMAIL,
            price: '75',
            term: 'monthly',
        }),
    });
    check('status 500', declinedRes.status === 500);
    const declinedData = await declinedRes.json();
    check('success: false', declinedData.success === false);
    check('has message', !!declinedData.message);

    console.log('\n=== Done ===\n');
}

function check(label, pass) {
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
}

run().catch(err => { console.error(err); process.exit(1); });
```

---

#### `claudePlans/test-stripe-webhooks.js`

Verifies webhook handling by triggering test events via the Stripe CLI. Requires the Stripe CLI to be installed and authenticated.

```js
// claudePlans/test-stripe-webhooks.js
// Pre-req: stripe CLI installed, stripe login done, dev server on :3000
// IMPORTANT: run `stripe listen --forward-to localhost:3000/api/stripe/webhook` first
// Run: node claudePlans/test-stripe-webhooks.js

const { execSync } = require('child_process');

const EVENTS = [
    'invoice.payment_succeeded',
    'customer.subscription.deleted',
    'invoice.payment_failed',
];

console.log('\n=== Stripe Webhook Trigger Tests ===\n');
console.log('NOTE: check server logs for webhook.received / webhook.processed events\n');
console.log('If no matching user_setting exists in DB the webhook will log webhook.unmatched — that is expected.\n');

for (const event of EVENTS) {
    console.log(`Triggering: ${event}`);
    try {
        const out = execSync(`stripe trigger ${event} 2>&1`, { timeout: 15000 }).toString();
        const sent = out.includes('completed') || out.includes('triggered');
        console.log(`  ${sent ? '✅' : '❌'} Stripe CLI sent event`);
    } catch (err) {
        console.log(`  ❌ CLI error: ${err.message}`);
    }
}

console.log('\nNow check your dev server terminal for log output.\n');
console.log('Expected log events:');
console.log('  webhook.received  — for each trigger');
console.log('  webhook.unmatched — normal when no matching sub in DB');
console.log('  webhook.sig_failed — should NOT appear');
console.log('\n=== Done ===\n');
```

---

#### `claudePlans/test-stripe-renewalstatus.js`

Lightweight check of the renewalStatus endpoint for multiple user types.

```js
// claudePlans/test-stripe-renewalstatus.js
// Run: node claudePlans/test-stripe-renewalstatus.js

const BASE = 'http://localhost:3000';

// Fill in emails from claudePlans/test-users.json
const CASES = [
    { email: 'REPLACE_active_expired@example.com', expectRenewal: true,  label: 'active_expired user' },
    { email: 'REPLACE_stripe_active@example.com',  expectRenewal: false, label: 'active Stripe user' },
    { email: 'REPLACE_inactive@example.com',       expectRenewal: false, label: 'inactive user' },
    { email: 'notarealuser@example.com',            expectRenewal: false, label: 'unknown email' },
];

async function run() {
    console.log('\n=== renewalStatus Endpoint Tests ===\n');
    for (const c of CASES) {
        const res = await fetch(`${BASE}/api/user/renewalStatus?email=${encodeURIComponent(c.email)}`);
        const data = await res.json();
        const pass = data.needsRenewal === c.expectRenewal;
        console.log(`  ${pass ? '✅' : '❌'} ${c.label} — needsRenewal: ${data.needsRenewal} (expected: ${c.expectRenewal})`);
    }
    console.log('\n=== Done ===\n');
}

run().catch(err => { console.error(err); process.exit(1); });
```

---

### Manual E2E checklist (browser)

Run after deploying to Vercel preview. Use Stripe test mode keys.

**New signup flow:**
- [ ] `/subscribe` → "Start For Free" → `/checkout?amount=75&term=monthly&trial=true`
- [ ] No `authorize.net` script tag in page source
- [ ] Stripe CardElement renders
- [ ] Fill all fields + card `4242 4242 4242 4242` → submit → loading spinner
- [ ] Neon: `user` + `user_setting` rows created, `stripeCustomerId` and `stripeSubscriptionId` populated
- [ ] SendGrid: credentials email received
- [ ] Redirect to `https://my.gymnasticbodies.com/?authToken=...` — user is logged in

**Renewal flow:**
- [ ] Log in on `my.gymnasticbodies.com` with an `active_expired` user's email
- [ ] Redirected to `https://app.gymnasticbodies.com/renew?email=xxx`
- [ ] Email shown in UI (read-only)
- [ ] Historical billing amount shown (e.g. "$25 / month")
- [ ] Fill card `4242 4242 4242 4242` → submit
- [ ] Neon: `user_setting.status = 'active'`, `stripeSubscriptionId` set, `migration_type = 'stripe'`
- [ ] Stripe test dashboard: subscription visible
- [ ] Redirect to `my.gymnasticbodies.com/?authToken=xxx&source=renewal` — user logged in

**Error paths:**
- [ ] Declined card `4000 0000 0000 0002` → inline error, no subscription created, no redirect
- [ ] Wrong/no email on `/renew` → inline error before any Stripe call

**Webhook (Stripe CLI `stripe listen` running):**
- [ ] `invoice.payment_succeeded` → `renewaldate` updated in DB
- [ ] `customer.subscription.deleted` → `status = 'cancelled'`, cancellation email sent
- [ ] Replay same deletion event → no duplicate email sent

---

## Part 3: Verifying Logs

After running tests, check Vercel function logs:

```bash
# Production logs
vercel logs --follow

# Or in Vercel dashboard:
# Project → Functions → select route → Logs tab
```

Expected log lines (JSON, one per event):

```json
{"ts":"2026-...","level":"info","event":"signup.attempt","email":"...","trial":true,"term":"monthly","amount":"75"}
{"ts":"2026-...","level":"info","event":"signup.success","email":"...","stripeCustomerId":"cus_...","stripeSubscriptionId":"sub_..."}
{"ts":"2026-...","level":"info","event":"webhook.received","eventType":"invoice.payment_succeeded","subscriptionId":"sub_..."}
{"ts":"2026-...","level":"info","event":"webhook.processed","eventType":"invoice.payment_succeeded","subscriptionId":"sub_..."}
```

Failure cases should log `level: "error"` with an `error.message` and `error.stack`.

---

## Implementation Order

1. [ ] **Add env vars** — `LOG_ENABLED=true` + `LOG_LEVEL=info` to `.env.local` and Vercel project settings (all environments)
2. [ ] **`lib/logger.js`** — create the structured logger (5 min)
3. [ ] **Wire logger into all 4 routes** — add log calls at key points (20 min)
4. [ ] **Deploy to Vercel preview** — test logs are appearing
5. [ ] **Install test scripts** — write `claudePlans/test-stripe-*.js` files (30 min)
6. [ ] **Populate test email cases** — pull from `claudePlans/test-users.json`, fill in REPLACE_ values
7. [ ] **Run `test-stripe-renewalstatus.js`** — validates read-only endpoint
8. [ ] **Run `test-stripe-renewal.js`** — validates full renewal flow
9. [ ] **Run `test-stripe-signup.js`** — validates new signup flow
10. [ ] **Run `test-stripe-webhooks.js`** — validates webhook handling
11. [ ] **Manual E2E browser checklist** — sign off on each item above
