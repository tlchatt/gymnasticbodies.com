// Test: renewalStatus endpoint across all user types
// Hits the live site — no dev server needed, no Stripe keys needed (read-only)
// Run: node claudePlans/test-stripe-renewalstatus.js

const BASE = 'https://app.gymnasticbodies.com';

const CASES = [
    { email: 'gw12z33@tlchatt.com',       expectRenewal: true,  label: 'active_expired user' },
    { email: 'l2taouk@hotmail.com',        expectRenewal: false, label: 'active Stripe user' },
    { email: 'test@tlchatt.com',           expectRenewal: false, label: 'inactive user' },
    { email: 'notarealuser_xyz_123@example.com', expectRenewal: false, label: 'unknown email' },
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
