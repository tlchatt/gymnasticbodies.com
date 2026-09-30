import { neon } from '@neondatabase/serverless';
import Stripe from 'stripe';
import fs from 'fs';
const sql = neon(process.env.DATABASE_URL);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const CONFIRM = process.argv.includes('--confirm');
// collect succeeded, unrefunded charges on deleted customers since 9/20
const byEmail = {};
for await (const ch of stripe.charges.list({ created:{gte: Math.floor(Date.parse('2026-09-20')/1000)}, limit:100 })) {
  if (ch.status!=='succeeded' || !ch.customer || ch.amount_refunded>0) continue;
  const c = await stripe.customers.retrieve(ch.customer);
  if (!c.deleted) continue;
  const em = (ch.billing_details?.email || ch.receipt_email || '').toLowerCase();
  (byEmail[em] ||= []).push({ id: ch.id, amt: ch.amount/100, created: ch.created, customer: ch.customer });
}
const plan = [];
for (const [email, charges] of Object.entries(byEmail)) {
  charges.sort((a,b)=>a.created-b.created);
  const [u] = await sql`select u.id, u.email, u.name, u.migration_type mt, u.customer_segment seg from "user" u where lower(u.email)=${email}`;
  const setting = u ? (await sql`select id, data, stripe_subscription_id from user_setting where user_id=${u.id} and type='subscription'`) : [];
  let live = null;
  const custs = await stripe.customers.list({ email, limit: 10 });
  for (const c of custs.data) { const s = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 5 }); for (const x of s.data) if (['active','trialing'].includes(x.status)) live = x.id; }
  if (email === 'cornel@pdtsa.co.za') live = 'on cornel@pdtsa.co (sub on cus_VK8Tjom0VYkoBP)';
  const keep = live ? null : charges[0];
  const refund = live ? charges : charges.slice(1);
  const d = new Date(charges[0].created*1000); d.setUTCMonth(d.getUTCMonth()+2);
  plan.push({ email, userId: u?.id, name: u?.name, now: `${u?.mt}/${u?.seg}`, subRows: setting.length, liveSub: live,
    charges: charges.length, keep: keep?.id, refund: refund.map(r=>r.id), refundTotal: refund.reduce((a,b)=>a+b.amt,0),
    accessUntil: live ? null : d.toISOString() });
}
console.log(JSON.stringify(plan, null, 1));
fs.writeFileSync('../claudePlans/offer-crash-repair-2026-09-29.json', JSON.stringify({ generatedAt: new Date().toISOString(), confirm: CONFIRM, plan }, null, 1));
if (!CONFIRM) process.exit(0);
for (const p of plan) {
  if (!p.userId) { console.log('SKIP no user', p.email); continue; }
  for (const id of p.refund) {
    const r = await stripe.refunds.create({ charge: id, reason: 'duplicate', metadata: { case: 'offer_crash_2026-09', email: p.email } }, { idempotencyKey: `offer-crash-refund-${id}` });
    console.log('refunded', p.email, id, r.status);
  }
  if (!p.liveSub) {
    const [row] = await sql`select id, data from user_setting where user_id=${p.userId} and type='subscription' order by id limit 1`;
    let data = {}; try { data = JSON.parse(row?.data || '{}'); } catch {}
    Object.assign(data, { status: 'active', renewaldate: p.accessUntil, price: '15', term: 'monthly', note: 'offer checkout crash 2026-09: 1 paid month (kept charge ' + p.keep + ') + 1 month apology credit' });
    if (row) await sql`update user_setting set status='active', data=${JSON.stringify(data)} where id=${row.id}`;
    else await sql`insert into user_setting (user_id, type, status, data, updated_at) values (${p.userId}, 'subscription', 'active', ${JSON.stringify(data)}, now())`;
    await sql`update "user" set migration_type='current', customer_segment='subscriber' where id=${p.userId}`;
  }
  await sql`INSERT INTO app_logs (level, event, email, user_id, source, data) VALUES ('info','admin.billing_fix',${p.email},${p.userId},'claude-tooling',
    ${JSON.stringify({ reason: 'offer checkout charged then crashed (fixed 9cc28cf)', kept: p.keep, refunded: p.refund, refundTotal: p.refundTotal, accessUntil: p.accessUntil, liveSub: p.liveSub })})`;
  console.log('done', p.email);
}
