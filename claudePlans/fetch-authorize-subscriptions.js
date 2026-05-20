// Fetch active ARB subscriptions from Authorize.net and match to Neon users
// Run with: node claudePlans/fetch-authorize-subscriptions.js
// Add --write flag to populate authorize_subscription_id in DB after reviewing output

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { APIContracts: ApiContracts, APIControllers: ApiControllers, Constants: SDKConstants } = require('authorizenet');
const { Pool } = require('pg');

const WRITE_MODE = process.argv.includes('--write');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function getMerchantAuth() {
    const auth = new ApiContracts.MerchantAuthenticationType();
    auth.setName(process.env.AUTHORIZE_NET_API_LOGIN_ID);
    auth.setTransactionKey(process.env.AUTHORIZE_NET_TRANSACTION_KEY);
    return auth;
}

async function getActiveSubscriptions() {
    return new Promise((resolve, reject) => {
        const merchantAuth = new ApiContracts.MerchantAuthenticationType();
        merchantAuth.setName(process.env.AUTHORIZE_NET_API_LOGIN_ID);
        merchantAuth.setTransactionKey(process.env.AUTHORIZE_NET_TRANSACTION_KEY);

        const request = new ApiContracts.ARBGetSubscriptionListRequest();
        request.setMerchantAuthentication(merchantAuth);
        request.setSearchType(ApiContracts.ARBGetSubscriptionListSearchTypeEnum.SUBSCRIPTIONACTIVE);

        const ctrl = new ApiControllers.ARBGetSubscriptionListController(request.getJSON());
        ctrl.setEnvironment(SDKConstants.endpoint.production);
        ctrl.execute(() => {
            const response = ctrl.getResponse();
            const result = new ApiContracts.ARBGetSubscriptionListResponse(response);
            if (result.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
                const subs = result.getSubscriptionDetails()?.getSubscriptionDetail() ?? [];
                resolve(Array.isArray(subs) ? subs : [subs]);
            } else {
                reject(new Error(result.getMessages().getMessage()[0].getText()));
            }
        });
    });
}

async function main() {
    console.log(`\nFetching active Auth.net ARB subscriptions...\n`);

    const subscriptions = await getActiveSubscriptions();
    console.log(`Found ${subscriptions.length} active subscriptions in Auth.net\n`);

    const results = [];

    for (const sub of subscriptions) {
        const subId = sub.getId();
        const customerProfileId = sub.getCustomerProfileId?.() ?? null;
        const status = sub.getStatus();
        const amount = sub.getAmount();
        const name = sub.getName();

        // Match to Neon user via autorize_customer_id
        const { rows } = await pool.query(
            `SELECT us.id as setting_id, us.user_id, us.autorize_customer_id, us.authorize_subscription_id,
                    u.email, u.name as user_name
             FROM user_setting us
             JOIN "user" u ON u.id = us.user_id
             WHERE us.autorize_customer_id = $1 AND us.type = 'subscription'
             LIMIT 1`,
            [String(customerProfileId)]
        );

        const match = rows[0] ?? null;
        results.push({ subId, customerProfileId, status, amount, name, match });
    }

    // Print report
    console.log('='.repeat(90));
    console.log('REPORT: Auth.net Active Subscriptions → Neon Matches');
    console.log('='.repeat(90));

    let matched = 0, unmatched = 0, alreadySet = 0;

    for (const r of results) {
        if (r.match) {
            matched++;
            const already = r.match.authorize_subscription_id ? ' [already set]' : '';
            if (already) alreadySet++;
            console.log(`✅ MATCH   | Sub ID: ${r.subId} | $${r.amount} | ${r.match.email} | ${r.match.user_name}${already}`);
        } else {
            unmatched++;
            console.log(`❌ NO MATCH | Sub ID: ${r.subId} | $${r.amount} | CustomerProfileId: ${r.customerProfileId} | Name: ${r.name}`);
        }
    }

    console.log('\n' + '='.repeat(90));
    console.log(`Total: ${results.length} | Matched: ${matched} | Unmatched: ${unmatched} | Already set: ${alreadySet}`);
    console.log('='.repeat(90));

    if (WRITE_MODE) {
        console.log('\nWriting authorize_subscription_id to Neon...\n');
        let written = 0;
        for (const r of results) {
            if (r.match && !r.match.authorize_subscription_id) {
                await pool.query(
                    `UPDATE user_setting SET authorize_subscription_id = $1, subscription_in_authorize = true WHERE id = $2`,
                    [String(r.subId), r.match.setting_id]
                );
                written++;
                console.log(`  Wrote sub ID ${r.subId} → ${r.match.email}`);
            }
        }
        console.log(`\nDone. ${written} records updated.`);
    } else {
        console.log('\nDry run — no changes written. Re-run with --write to update Neon.');
    }

    await pool.end();
}

main().catch(err => {
    console.error('Error:', err.message);
    pool.end();
    process.exit(1);
});
