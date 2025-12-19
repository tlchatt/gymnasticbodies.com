import { db } from "@/Drizzle/index.ts"; // your drizzle instance
import { user_setting, user } from "@/Drizzle/db/schema"
import { eq } from 'drizzle-orm';

export async function POST(request) {
    const contentType = request.headers.get('Content-Type');
    console.log('Content-Type:', contentType);

    if (contentType.includes('application/x-www-form-urlencoded')) {
        let dataNew = {
            id: 432626,
            parent_id: 432625,
            status: 'active',
            currency: 'USD',
            version: '6.4.1',
            prices_include_tax: false,
            date_created: '2025-12-19T10:22:53',
            date_modified: '2025-12-19T10:22:54',
            discount_total: '0.00',
            discount_tax: '0.00',
            shipping_total: '0.00',
            shipping_tax: '0.00',
            cart_tax: '0.00',
            total: '225.00',
            total_tax: '0.00',
            customer_id: 34287,
            order_key: 'wc_order_9Ce8T1p1BTIVO',
            billing: {
                first_name: 'Greggory Wiley',
                last_name: '',
                company: '',
                address_1: '',
                address_2: '',
                city: '',
                state: '',
                postcode: '30750',
                country: 'US',
                email: 'greggorywiley@tlchatt.com',
                phone: ''
            },
            shipping: {
                first_name: '',
                last_name: '',
                company: '',
                address_1: '',
                address_2: '',
                city: '',
                state: '',
                postcode: '',
                country: '',
                phone: ''
            },
            payment_method: 'authorize_net_cim_credit_card',
            payment_method_title: 'Auth Credit Card',
            customer_ip_address: '49.36.119.173',
            customer_user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
            created_via: 'checkout',
            customer_note: '',
            date_completed: null,
            date_paid: '2025-12-19T10:22:53',
            number: 'GB432626',
            meta_data: [
                {
                    id: 19379052,
                    key: '_billing_wooccm11',
                    value: 'greggorywiley@tlchatt.com'
                },
                { id: 19379053, key: 'is_vat_exempt', value: 'no' },
                {
                    id: 19379079,
                    key: '_wc_authorize_net_cim_credit_card_payment_token',
                    value: '1330680790'
                },
                {
                    id: 19379080,
                    key: '_wc_authorize_net_cim_credit_card_customer_id',
                    value: '779397289'
                }
            ],
            line_items: [
                {
                    id: 475601,
                    name: 'GymFit TV - $225 USD / Quarter',
                    product_id: 51,
                    variation_id: 55,
                    quantity: 1,
                    tax_class: '',
                    subtotal: '225.00',
                    subtotal_tax: '0.00',
                    total: '225.00',
                    total_tax: '0.00',
                    taxes: [],
                    meta_data: [Array],
                    sku: 'gbannual',
                    price: 225,
                    parent_name: 'GymFit TV'
                }
            ],
            tax_lines: [],
            shipping_lines: [],
            fee_lines: [],
            coupon_lines: [],
            payment_url: 'https://www.gymnasticbodies.com/checkout/order-pay/432626/?pay_for_order=true&key=wc_order_9Ce8T1p1BTIVO',
            date_created_gmt: '2025-12-19T17:22:53',
            date_modified_gmt: '2025-12-19T17:22:54',
            date_completed_gmt: null,
            date_paid_gmt: '2025-12-19T17:22:53',
            billing_period: 'month',
            billing_interval: '3',
            start_date_gmt: '2025-12-19T17:22:53',
            trial_end_date_gmt: '2025-12-26T17:22:53',
            next_payment_date_gmt: '2025-12-26T17:22:53',
            payment_retry_date_gmt: '',
            last_payment_date_gmt: '2025-12-19T17:22:53',
            cancelled_date_gmt: '',
            end_date_gmt: '',
            resubscribed_from: '',
            resubscribed_subscription: '',
            removed_line_items: [],
            _links: {
                self: [[Object]],
                collection: [[Object]],
                customer: [[Object]],
                up: [[Object]]
            }
        }
        //write settings, user_setting table
        const formData = await request.formData();
        const data = Object.fromEntries(formData);
        let subscriptionData = {
            status: data.status,
            renewaldate: data.next_payment_date_gmt,
            startdate: data.start_date_gmt
        }
        console.log('subscriptionData data:', subscriptionData);
        try {
            const newUser = await db.insert(user).values({
                name: data.billing.first_name,
                email: data.billing.email,
            }).returning({ id: user.id });

            const attachSetting = await db.insert(user_setting).values({
                type: 'subscription',
                data: subscriptionData,
                user_id: newUser[0].id
            }).returning();
        }
        catch (error) {
            return new Response(`Subscription Webhook error: ${error.message}`, {

                status: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            })
        }

        return new Response('OK', { status: 200 });
    } else {
        const json = await request.json()
        console.log('user json', json)
        if (json.status) {
            //write settings, user_setting table
            // const formData = await request.formData();
            // const data = Object.fromEntries(formData);
            let subscriptionData = {
                status: json.status,
                renewaldate: json.next_payment_date_gmt,
                startdate: json.start_date_gmt
            }
            console.log('subscriptionData data:', subscriptionData);
            try {
                const newUser = await db.insert(user).values({
                    name: json.billing.first_name,
                    email: json.billing.email,
                }).returning({ id: user.id });

                const attachSetting = await db.insert(user_setting).values({
                    type: 'subscription',
                    data: subscriptionData,
                    user_id: newUser[0].id
                }).returning();
            }
            catch (error) {
                return new Response(`Subscription Webhook error: ${error.message}`, {

                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    },
                })
            }

            return new Response('OK', { status: 200 });
        } else {
            try {
                let queryExisting = await db.select().from(user_setting).where(eq(user_setting.userId, json.userId));
                let existing = queryExisting ? queryExisting?.filter(item => item.data.type === json.data.type)[0] : null
                if (existing) {
                    console.log('existing', existing)
                    let updateQuery = await db.update(user_setting)
                        .set(
                            {
                                type: json.type,
                                data: json.data,
                                userId: json.userId
                            }
                        ).where(eq(user_setting.id, existing.id)).returning();
                    console.log('updateQuery return', updateQuery)
                    return Response.json(updateQuery)
                }
                else {
                    console.log('Not existing', existing)
                    let insertQuery = await db.insert(user_setting).values(
                        {
                            type: json.type,
                            data: json.data,
                            userId: json.userId
                        }
                    ).returning();
                    console.log('insertQuery return', insertQuery)
                    return Response.json(insertQuery)
                }
            }
            catch (error) {
                return new Response(`Webhook error: ${error.message}`, {

                    status: 400,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    },
                })
            }
        }

    }

    /*
    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        body: {
            "jwtAuthorizationToken": "eyJhbGciOiJIUzUxMiJ9.eyJmbmFtZSI6Ikx1a2UiLCJzdWIiOiJsdWtlc2VhcnJhQGljbG91ZC5jb20iLCJsbmFtZSI6IiIsInR6IjoiQW1lcmljYS9Ub3JvbnRvIiwidGFnaWRzIjpbMTAyLDEyMiwyMjQsMjI2LDIyOCwzMzAsNDQ2LDYxMiw2MTYsNjIwLDYzMiw2OTgsNzg4LDEwMzYsMTMwMV0sImV4cCI6MTc2NTkxMjAxNiwiaWF0IjoxNzY1ODI1NjE2LCJjaWQiOjQxMTg0N30.JLW9ezWmdkQX71VFGT2WOw5Eu1ucx1YSn6ePiRy84oTUhIpdVLJ27d37fBwtBZeKaHyR5LHOvcb7MEqPRDGoNw",
            "jwtRefreshToken": "eyJhbGciOiJIUzUxMiJ9.eyJhbGxhY2Nlc3MiOnRydWUsInN1YiI6Imx1a2VzZWFycmFAaWNsb3VkLmNvbSIsInR6IjoiQW1lcmljYS9Ub3JvbnRvIiwiZnJlZW1lbSI6dHJ1ZSwidHlwZSI6InJlZnJlc2giLCJleHAiOjE3ODEzNzc2MTYsInNwIjp0cnVlLCJpYXQiOjE3NjU4MjU2MTYsImNpZCI6NDExODQ3fQ.Lpdq06b0wowjiV4WeYV9s0TCgtrPMGYn7hRgbxQKil4oh_P2MxSDk80hchDJEaUo6bUNQaVY928u-ntNeUcapQ",
            "timezone": "America/Toronto",
            "isAllAccessUser": true,
            "isFreeMember": true,
            "hasCourseProduct": true
        }
    })
    */
}
// GET just to return 200 status for preflight to work
export async function GET() {
    // console.log("user_setting:",user_setting)
    // let queryExisting = await db.select().from(user_setting).where(eq(user_setting.userId));
    // console.log("queryExisting in GET:",queryExisting)
    return new Response('Success!', {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}