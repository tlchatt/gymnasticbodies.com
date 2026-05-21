// Test: Stripe new-user signup flow
// Pre-req: dev server on :3000, test-mode Stripe keys in .env.local
// Run: node claudePlans/test-stripe-signup.js

const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const key = process.env.STRIPE_SECRET_KEY || '';
if (!key.startsWith('sk_test_')) {
    console.error('ERROR: STRIPE_SECRET_KEY must be a test-mode key (sk_test_...) — refusing to run against live Stripe.');
    process.exit(1);
}

const stripe = new Stripe(key);
const BASE = 'http://localhost:3002';

function check(label, pass) {
    console.log(`  ${pass ? '✅' : '❌'} ${label}`);
}

async function createTestPaymentMethod(token = 'tok_visa') {
    const pm = await stripe.paymentMethods.create({ type: 'card', card: { token } });
    return pm.id;
}

async function run() {
    const testEmail = `test-signup-${Date.now()}@example.com`;
    console.log('\n=== Stripe Signup Tests ===\n');

    // 1. Happy path — new user with 7-day trial
    console.log('1. Happy path — new user, 7-day trial...');
    const pm1 = await createTestPaymentMethod();
    const res1 = await fetch(`${BASE}/api/stripe/create-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            paymentMethodId: pm1,
            email: testEmail,
            phone: '555-1234',
            country: 'US',
            password: 'TestPass123!',
            amount: '75',
            term: 'monthly',
            trial: true,
        }),
    });
    const data1 = await res1.json();
    check('status 200', res1.status === 200);
    check('subscriptionCreated: true', data1.subscriptionCreated === true);
    check('has data field', !!data1.data);
    const parsed1 = JSON.parse(data1.data);
    check('has token', !!parsed1.token);
    check('email matches', parsed1.email === testEmail);

    // 2. Duplicate email — should block re-signup
    console.log('\n2. Duplicate email...');
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

run().catch(err => { console.error(err); process.exit(1); });
