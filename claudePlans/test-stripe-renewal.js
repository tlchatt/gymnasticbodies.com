// Test: Stripe renewal flow for active_expired users
// Pre-req: dev server on :3000, test-mode Stripe keys in .env.local
// Edit TEST_EMAIL below before running — must be an active_expired user in Neon
// Run: node claudePlans/test-stripe-renewal.js

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const key = process.env.STRIPE_SECRET_KEY || '';
if (!key.startsWith('sk_test_')) {
    console.error('ERROR: STRIPE_SECRET_KEY must be a test-mode key (sk_test_...) — refusing to run against live Stripe.');
    process.exit(1);
}

const stripe = new Stripe(key);
const BASE = 'http://localhost:3002';

// Test account — active_expired in Neon. Running this will convert it to a Stripe subscriber.
const TEST_EMAIL = 'paywall-test@tlchatt.com';

function check(label, pass) {
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
}

async function createTestPaymentMethod(token = 'tok_visa') {
    const pm = await stripe.paymentMethods.create({ type: 'card', card: { token } });
    return pm.id;
}

async function run() {
    if (TEST_EMAIL.startsWith('REPLACE')) {
        console.error('ERROR: Edit TEST_EMAIL at the top of this file before running.');
        process.exit(1);
    }

    console.log('\n=== Stripe Renewal Tests ===\n');

    // 1. renewalStatus — should be true for an active_expired user
    console.log('1. renewalStatus check...');
    const statusRes = await fetch(`${BASE}/api/user/renewalStatus?email=${encodeURIComponent(TEST_EMAIL)}`);
    const status = await statusRes.json();
    check('status 200', statusRes.status === 200);
    check('needsRenewal: true', status.needsRenewal === true);
    check('has price', !!status.price);
    check('has term', !!status.term);
    console.log(`   price: ${status.price}, term: ${status.term}`);

    // 2. Happy path renewal
    console.log('\n2. Happy path — visa test card...');
    const pm1 = await createTestPaymentMethod();
    const renewRes = await fetch(`${BASE}/api/stripe/renew-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pm1, email: TEST_EMAIL, price: status.price, term: status.term }),
    });
    const renewData = await renewRes.json();
    check('status 200', renewRes.status === 200);
    check('success: true', renewData.success === true);
    check('has token', !!renewData.token);
    check('has userId', !!renewData.userId);

    // 3. renewalStatus after renewal — should now be false
    console.log('\n3. renewalStatus after renewal...');
    const statusRes2 = await fetch(`${BASE}/api/user/renewalStatus?email=${encodeURIComponent(TEST_EMAIL)}`);
    const status2 = await statusRes2.json();
    check('needsRenewal: false', status2.needsRenewal === false);

    // 4. Declined card
    console.log('\n4. Declined card...');
    const pmDeclined = await stripe.paymentMethods.create({ type: 'card', card: { token: 'tok_chargeDeclined' } });
    const declinedRes = await fetch(`${BASE}/api/stripe/renew-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethodId: pmDeclined.id, email: TEST_EMAIL, price: '75', term: 'monthly' }),
    });
    check('status 500', declinedRes.status === 500);
    const declinedData = await declinedRes.json();
    check('success: false', declinedData.success === false);
    check('has message', !!declinedData.message);

    console.log('\n=== Done ===\n');
}

run().catch(err => { console.error(err); process.exit(1); });
