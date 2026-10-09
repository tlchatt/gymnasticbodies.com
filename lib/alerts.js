// One alerts path to Slack. Anything that must not fail silently — a chargeback, a fraud warning,
// a refund Stripe later failed, a support-agent play whose action failed, an escalation, a promise
// we made a member that reality no longer matches — goes through alert(): ONE top-level message in
// the support channel (never a thread reply, so it can't be buried), plus an `alert.<kind>` row in
// app_logs (the event ledger).
//
// Channel: SLACK_ALERTS_CHANNEL_ID, else the support agent's SLACK_SUPPORT_CHANNEL_ID, else the
// live support channel id. Uses the support agent's slack() helper.
//
// alert() NEVER throws — an alert must not break the webhook / fire / cron that raised it.
//
// once: { event, key } makes an alert fire at most once per key: the key is claimed atomically as an
// app_logs row (event = once.event, data.key = key) before posting. If the Slack post fails the
// claim is released, so the next run (daily promise check) tries again.
//
// Plain neon SQL (no Drizzle) so CLI tools can load it through jiti too.
import { neon } from '@neondatabase/serverless';
import { slack } from '@/lib/support/slack';

let _sql = null;
const db = () => (_sql ||= neon(process.env.DATABASE_URL));

export const APP_URL = process.env.SUPPORT_PUBLIC_URL || 'https://app.gymnasticbodies.com';
const FALLBACK_CHANNEL = 'C0B745W8BHN'; // #gymnstic-bodies-support
export const alertsChannel = () => process.env.SLACK_ALERTS_CHANNEL_ID || process.env.SLACK_SUPPORT_CHANNEL_ID || FALLBACK_CHANNEL;
export const caseUrl = (id) => `${APP_URL}/admin/cases/${id}`;

const ICON = { critical: '🚨', high: '⚠️', info: 'ℹ️' };
const STRIPE_LABEL = { dispute: 'dispute', charge: 'charge', refund: 'refund', customer: 'customer', subscription: 'subscription', efw: 'fraud warning', invoice: 'invoice' };
const STRIPE_LINK = { customer: 'customers', charge: 'payments', subscription: 'subscriptions' };

// The Slack text for one alert (exported for tests).
export function renderAlert({ title, lines = [], email, caseId, severity = 'high', stripe = {} }) {
  const out = [`${ICON[severity] || ICON.high} *${title}*`];
  if (email) out.push(`Member: ${email}`);
  if (caseId) out.push(`Case: <${caseUrl(caseId)}|#${caseId}>`);
  for (const l of lines) if (l != null && String(l).trim()) out.push(`• ${l}`);
  const ids = Object.entries(stripe || {})
    .flatMap(([k, v]) => (Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]]))
    .filter(([, v]) => v)
    .map(([k, v]) => (STRIPE_LINK[k] ? `${STRIPE_LABEL[k] || k} <https://dashboard.stripe.com/${STRIPE_LINK[k]}/${v}|${v}>` : `${STRIPE_LABEL[k] || k} \`${v}\``));
  if (ids.length) out.push(`Stripe: ${ids.join(' · ')}`);
  return out.join('\n');
}

// Awaited app_logs insert (logger.js inserts fire-and-forget, which a serverless function can
// drop when it returns). Never throws.
export async function logEvent(event, { email = null, userId = null, level = 'info', source = 'alerts', ...data } = {}) {
  try {
    const [r] = await db()`INSERT INTO app_logs (level, event, email, user_id, source, data)
      VALUES (${level}, ${event}, ${email}, ${userId}, ${source}, ${JSON.stringify(data)}::json) RETURNING id`;
    return r?.id ?? null;
  } catch (err) {
    console.error('logEvent failed', event, err?.message);
    return null;
  }
}

// Claim `key` under `event` exactly once (advisory lock + NOT EXISTS in one transaction, so two
// webhook deliveries racing each other cannot both win). Returns the claim row id, or null if the
// key was already claimed.
export async function claimOnce(event, key, { email = null, userId = null, ...data } = {}) {
  const sql = db();
  const [, rows] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext(${event + '|' + key}))`,
    sql`INSERT INTO app_logs (level, event, email, user_id, source, data)
        SELECT 'info', ${event}, ${email}, ${userId}, 'alerts', ${JSON.stringify({ key, ...data })}::json
        WHERE NOT EXISTS (SELECT 1 FROM app_logs WHERE event = ${event} AND (data::jsonb->>'key') = ${key})
        RETURNING id`,
  ]);
  return rows?.[0]?.id ?? null;
}

// Keys already claimed under `event` (for dry runs: "would this alert again?").
export async function claimedKeys(event) {
  const rows = await db()`SELECT data::jsonb->>'key' AS key FROM app_logs WHERE event = ${event}`;
  return new Set(rows.map((r) => r.key).filter(Boolean));
}

async function releaseClaim(id) {
  try { await db()`DELETE FROM app_logs WHERE id = ${id}`; } catch { /* best effort */ }
}

// alert({ kind, title, lines, email, caseId, severity, stripe, userId, once, data })
//   kind      short slug — logged as `alert.<kind>`
//   severity  'critical' | 'high' | 'info'
//   stripe    { dispute, charge, refund, customer, subscription, ... } ids shown on the message
//   once      { event, key } — alert at most once per key (see top of file)
// Returns { ok, ts?, duplicate?, error? }.
export async function alert({ kind, title, lines = [], email = null, caseId = null, severity = 'high', stripe = {}, userId = null, once = null, data = {} } = {}) {
  let claimId = null;
  try {
    if (once?.key) {
      claimId = await claimOnce(once.event || `alert.${kind}.once`, String(once.key), { email, userId, kind, title, caseId });
      if (!claimId) return { ok: true, duplicate: true };
    }
    const channel = alertsChannel();
    const text = renderAlert({ title, lines, email, caseId, severity, stripe });
    let res;
    if (!process.env.SLACK_BOT_TOKEN) res = { ok: false, error: 'no_slack_token' };
    else {
      try { res = await slack('chat.postMessage', { channel, text, unfurl_links: false, unfurl_media: false }); }
      catch (err) { res = { ok: false, error: err?.message || String(err) }; }
    }
    if (!res?.ok && claimId) { await releaseClaim(claimId); claimId = null; }
    await logEvent(`alert.${kind}`, {
      email, userId, level: severity === 'critical' ? 'error' : 'warn',
      title, lines, caseId, stripe, severity, channel, posted: !!res?.ok, slackTs: res?.ts || null,
      ...(res?.ok ? {} : { postError: res?.error || 'unknown' }), ...(once?.key ? { onceKey: once.key } : {}), ...data,
    });
    if (!res?.ok) console.error('alert post failed', kind, res?.error);
    return { ok: !!res?.ok, ts: res?.ts || null, ...(res?.ok ? {} : { error: res?.error || 'unknown' }) };
  } catch (err) {
    console.error('alert failed', kind, err?.message);
    if (claimId) await releaseClaim(claimId);
    return { ok: false, error: err?.message || String(err) };
  }
}
