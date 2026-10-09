// The money actions of the cloud support executor: cancel + refund. Loaded by ./execute.js.
// Both run the SAME cores as the admin routes (lib/adminSubscription.js), and both find the
// member's Stripe customers with resolveStripeCustomers — Neon's stored stripe_customer_id plus a
// case-insensitive email search — never a bare case-sensitive customers.list({ email }).
//
// Contract with executePlay: return a plain object on success; THROW on anything that did not
// happen. A thrown error marks the step failed and HOLDS the customer reply, so a member is never
// told "you're cancelled / refunded" when nothing changed. Never deletes a Stripe customer.
import { stripe, resolveStripeCustomers, listSubscriptionsForCustomers, LIVE_SUB_STATUSES } from '@/lib/stripeServerFunction';
import { cancelStripeSubscription, refundStripeCharge } from '@/lib/adminSubscription';
import { getUserWithEmail, queryUserSetting } from '@/lib/userSettings';

const ACTOR = () => ({ source: 'support-agent', adminId: process.env.SUPPORT_AGENT_USER_ID || undefined });

export async function memberContext(email) {
  const user = await getUserWithEmail(email);
  const setting = user ? await queryUserSetting(user.id, 'subscription') : null;
  const customers = await resolveStripeCustomers(email, { userId: user?.id });
  return { user, setting, customers };
}

// A trialing sub with no paid invoice is a real signup trial; trialing WITH paid invoices is a
// paying member we credited (credits push trial_end). Only the former is cancelled immediately.
async function isSignupTrial(sub) {
  if (sub.status !== 'trialing') return false;
  const { data } = await stripe.invoices.list({ subscription: sub.id, status: 'paid', limit: 20 });
  return !data.some((i) => i.amount_paid > 0);
}

// cancel — every live (active/trialing/past_due/unpaid) sub across the member's Stripe customers,
// or just params.subscription_id. Signup trial → cancel now; otherwise cancel at period end unless
// params.immediate. If nothing live is found: ok with nothing_to_cancel ONLY when Neon also shows
// no current plan; if Neon says they are current, fail (billing is somewhere we did not find).
async function cancel(email, p = {}) {
  const { user, setting, customers } = await memberContext(email);
  const subs = await listSubscriptionsForCustomers(customers);
  const wantId = [p.subscription_id, p.stripeSubscriptionId, p.stripe_subscription_id].find((x) => typeof x === 'string' && /^sub_[A-Za-z0-9]+$/.test(x));
  const immediate = p.immediate === true || p.cancel_type === 'immediate' || p.cancel_at_period_end === false;

  let targets;
  if (wantId) {
    const s = subs.find((x) => x.id === wantId);
    if (!s) throw new Error(`subscription ${wantId} is not on any of this member's Stripe customers (${customers.map((c) => c.id).join(', ') || 'none found'})`);
    if (!LIVE_SUB_STATUSES.includes(s.status)) return { nothing_to_cancel: true, subscription: wantId, status: s.status };
    targets = [s];
  } else {
    targets = subs.filter((s) => LIVE_SUB_STATUSES.includes(s.status));
  }

  if (!targets.length) {
    if (user?.migrationType === 'current') {
      const seg = user.customerSegment || 'unknown';
      throw new Error(seg === 'auth_net'
        ? 'member bills through Authorize.net — cancel the ARB in the Auth.net portal by hand'
        : `no live Stripe subscription found (customers checked: ${customers.map((c) => c.id).join(', ') || 'none'}), but Neon shows the member as current/${seg} — check by hand`);
    }
    return { nothing_to_cancel: true, customers: customers.map((c) => c.id), neon: user ? `${user.migrationType}/${user.customerSegment}` : 'no Neon account' };
  }

  const cancelled = [];
  for (const sub of targets) {
    const trial = await isSignupTrial(sub);
    const r = await cancelStripeSubscription({
      userId: user?.id || null, email: user?.email || email, setting,
      subscriptionId: sub.id, cancelNow: immediate || trial, trial, immediate, actor: ACTOR(),
    });
    cancelled.push({ sub: r.subscriptionId, customer: sub.customer, method: r.method, accessUntil: r.accessUntil ? new Date(r.accessUntil * 1000).toISOString().slice(0, 10) : null });
  }
  return { cancelled };
}

const toCents = (p) => {
  if (p.amount_cents != null) return Math.round(Number(p.amount_cents));
  if (p.amount == null || p.amount === '') return null;
  const n = parseFloat(String(p.amount).replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n) || n <= 0) throw new Error(`could not read refund amount "${p.amount}"`);
  return Math.round(n * 100); // agent amounts are dollars
};

// refund — params.charge_id if it is a real id, else the most recent succeeded, un-refunded,
// undisputed charge across the member's customers (that covers params.amount, if given).
// params.amount is dollars (partial refund); omitted = full remaining amount of that charge.
async function refund(email, p = {}) {
  const { user, customers } = await memberContext(email);
  if (!customers.length) throw new Error('no Stripe customer found for this member — nothing to refund');
  const ids = customers.map((c) => c.id);
  const amountCents = toCents(p);

  let chargeId = typeof p.charge_id === 'string' && /^(ch|py)_[A-Za-z0-9]+$/.test(p.charge_id) ? p.charge_id : null;
  if (!chargeId) {
    const all = [];
    for (const id of ids) all.push(...(await stripe.charges.list({ customer: id, limit: 20 })).data);
    const candidates = all
      .filter((c) => c.status === 'succeeded' && !c.disputed && c.amount - c.amount_refunded > 0)
      .filter((c) => amountCents == null || c.amount - c.amount_refunded >= amountCents)
      .sort((a, b) => b.created - a.created);
    if (!candidates.length) throw new Error(`no refundable charge found${amountCents != null ? ` covering $${(amountCents / 100).toFixed(2)}` : ''} on ${ids.join(', ')}`);
    chargeId = candidates[0].id;
  }
  const r = await refundStripeCharge({
    chargeId, amountCents, reason: p.reason, allowedCustomerIds: ids,
    userId: user?.id || null, email: user?.email || email, actor: ACTOR(),
  });
  return { refunded: `$${(r.amount / 100).toFixed(2)} ${String(r.currency || '').toUpperCase()}`, charge: r.chargeId, refund: r.refundId };
}

export default { cancel, refund };
