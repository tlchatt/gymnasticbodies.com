// Test: renewalStatus endpoint across all user types
// Pre-req: dev server on :3000
// Edit the CASES emails before running — pull from claudePlans/test-users.json
// Run: node claudePlans/test-stripe-renewalstatus.js

const BASE = 'http://localhost:3000';

// Replace placeholder emails with real ones from claudePlans/test-users.json
const CASES = [
    { email: 'REPLACE_active_expired@example.com', expectRenewal: true,  label: 'active_expired user' },
    { email: 'REPLACE_stripe_active@example.com',  expectRenewal: false, label: 'active Stripe user' },
    { email: 'REPLACE_inactive@example.com',       expectRenewal: false, label: 'inactive user' },
    { email: 'notarealuser_xyz_123@example.com',   expectRenewal: false, label: 'unknown email' },
];

async function run() {
    const placeholders = CASES.filter(c => c.email.startsWith('REPLACE'));
    if (placeholders.length > 0) {
        console.warn(`WARNING: ${placeholders.length} email(s) are still placeholders — those cases will likely fail.\n`);
    }

    console.log('\n=== renewalStatus Endpoint Tests ===\n');
    let passed = 0;
    for (const c of CASES) {
        const res = await fetch(`${BASE}/api/user/renewalStatus?email=${encodeURIComponent(c.email)}`);
        const data = await res.json();
        const pass = data.needsRenewal === c.expectRenewal;
        if (pass) passed++;
        console.log(`  ${pass ? '✅' : '❌'} ${c.label} — needsRenewal: ${data.needsRenewal} (expected: ${c.expectRenewal})`);
    }
    console.log(`\n${passed}/${CASES.length} passed\n`);
}

run().catch(err => { console.error(err); process.exit(1); });
