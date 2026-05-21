// Test: Stripe webhook handler — triggers test events via Stripe CLI
// Pre-req:
//   1. stripe CLI installed and authenticated (stripe login)
//   2. stripe listen --forward-to localhost:3002/api/stripe/webhook  (separate terminal)
//   3. dev server on :3000
// Run: node claudePlans/test-stripe-webhooks.js

const { execSync } = require('child_process');

const EVENTS = [
    'invoice.payment_succeeded',
    'customer.subscription.deleted',
    'invoice.payment_failed',
];

console.log('\n=== Stripe Webhook Trigger Tests ===\n');
console.log('Requires: stripe listen --forward-to localhost:3002/api/stripe/webhook\n');

let passed = 0;
for (const event of EVENTS) {
    process.stdout.write(`Triggering ${event} ... `);
    try {
        const out = execSync(`stripe trigger ${event} 2>&1`, { timeout: 20000 }).toString();
        const ok = out.includes('completed') || out.includes('triggered') || out.includes('sent');
        console.log(ok ? '✅ sent' : `❌ unexpected output:\n${out}`);
        if (ok) passed++;
    } catch (err) {
        console.log(`❌ CLI error: ${err.message}`);
    }
}

console.log(`\n${passed}/${EVENTS.length} events triggered successfully`);
console.log('\nCheck your dev server terminal for these log events:');
console.log('  webhook.received   — one per trigger');
console.log('  webhook.unmatched  — expected (no matching sub in local DB)');
console.log('  webhook.sig_failed — should NOT appear\n');
