/**
 * credit.js — the one way to give a member free time.
 *
 * WHY THIS EXISTS
 * "Give them a month" means two completely different things depending on the member,
 * and using the wrong one produces a promise we do not keep:
 *
 *   PAYWALLED member (no live subscription)
 *       Their access is gated by user_setting.subscription data.renewaldate, which the
 *       classifier reads. Pushing that date forward is exactly right, and it is the only
 *       thing that lets them back in.
 *
 *   PAYING subscriber (live Stripe subscription)
 *       renewaldate does NOTHING for them — their access already comes from the live
 *       subscription, and Stripe bills on its own schedule regardless of what Neon says.
 *       The only thing that gives them free time is pushing the subscription's trial_end,
 *       which delays the next charge. (Setting trial_end on an active sub flips its status
 *       to "trialing" — in this system "trialing" usually means "credited", not "on trial".)
 *
 * On 2026-08-07 five paying members were told in writing that a week or a month had been
 * added to their subscription, when only renewaldate had been moved. Stripe would have
 * charged all five on their normal dates. Corrected by hand the same day; this tool exists
 * so the next person does not have to notice.
 *
 * DETECTION: never trust user_setting.stripeSubscriptionId on its own. A member can be
 * billing on Stripe with nothing recorded in Neon (a second customer record, or a
 * subscription the webhook never linked back). This asks live Stripe by email as well —
 * the same findActiveStripeSubByEmail check the signup routes use.
 *
 * USAGE (from the app.gymnasticbodies.com repo root)
 *   node claudeTools/credit.js --email=x@y.com --days=7                 # dry run
 *   node claudeTools/credit.js --email=x@y.com --months=1 --confirm     # live
 *   node claudeTools/credit.js --emails-file=./list.txt --days=7 --confirm
 *   node claudeTools/credit.js --email=x@y.com --days=7 --reason="course access bug"
 *
 * Project copy (2026-10-17). Supersedes /var/www/Work/Gymfit/claudeTools/credit.js
 * (2026-08-07, outside git); logic unchanged, only the paths: node_modules come from this
 * repo, and env from .env.local when it exists, else .env.
 *
 * Always dry-runs unless --confirm. Every change is written to app_logs as
 * admin.billing_credit (Stripe) or admin.grant_access (paywalled), with before/after
 * dates, so a credit can always be traced and reversed.
 */
const path = require('path')
const fs = require('fs')

const APP = path.resolve(__dirname, '..')
const ENV = ['.env.local', '.env'].map(f => path.join(APP, f)).find(f => fs.existsSync(f))
require(path.join(APP, 'node_modules/dotenv')).config({ path: ENV, quiet: true })
const Stripe = require(path.join(APP, 'node_modules/stripe'))
const { neon } = require(path.join(APP, 'node_modules/@neondatabase/serverless'))

const sql = neon(process.env.DATABASE_URL)
const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

const arg = (n, d = null) => {
    const a = process.argv.find(x => x.startsWith(`--${n}=`))
    return a ? a.split('=').slice(1).join('=') : d
}
const DRY = !process.argv.includes('--confirm')
const REASON = arg('reason', 'goodwill credit')
const DAYS = Number(arg('days', 0))
const MONTHS = Number(arg('months', 0))

const iso = t => new Date(t * 1000).toISOString().slice(0, 10)
const parse = d => { let x = d; for (let i = 0; i < 2; i++) if (typeof x === 'string') { try { x = JSON.parse(x) } catch { break } } return x || {} }

// Mirrors lib/stripeServerFunction.findActiveStripeSubByEmail — kept in step deliberately.
async function findActiveSub(email) {
    const customers = await stripe.customers.list({ email, limit: 10 })
    for (const c of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 20 })
        const live = subs.data.find(s => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))
        if (live) return live
    }
    return null
}

function addTime(date) {
    const d = new Date(date)
    if (MONTHS) d.setUTCMonth(d.getUTCMonth() + MONTHS)
    if (DAYS) d.setUTCDate(d.getUTCDate() + DAYS)
    return d
}

async function creditOne(email) {
    const rows = await sql`select u.id, u.email, u.migration_type mt, s.id sid, s.data
                           from "user" u left join user_setting s on s.user_id = u.id and s.type = 'subscription'
                           where lower(u.email) = ${email}`
    if (!rows.length) return { email, outcome: 'no account' }
    const u = rows[0]

    const liveSub = await findActiveSub(u.email)

    // ── PAYING SUBSCRIBER: push the next charge ───────────────────────────────
    if (liveSub) {
        const item = liveSub.items?.data?.[0]
        // the real next-charge moment: an existing trial_end if credited before, else period end
        const baseTs = liveSub.trial_end || Number(item?.current_period_end ?? liveSub.current_period_end) || 0
        if (!baseTs) return { email, outcome: 'could not read next billing date', sub: liveSub.id }
        const next = Math.floor(addTime(baseTs * 1000).getTime() / 1000)

        if (!DRY) {
            await stripe.subscriptions.update(liveSub.id, { trial_end: next, proration_behavior: 'none' })
            // keep the cached date in step so admin/member screens agree with Stripe
            if (u.sid) {
                const data = parse(u.data)
                data.renewaldate = new Date(next * 1000).toISOString()
                await sql`update user_setting set data = ${JSON.stringify(data)} where id = ${u.sid}`
            }
            await sql`INSERT INTO app_logs (level, event, email, user_id, source, data)
                      VALUES ('info','admin.billing_credit',${u.email},${u.id},'claude-tooling',
                              ${JSON.stringify({ subscription: liveSub.id, days: DAYS, months: MONTHS,
                                                 from: iso(baseTs), to: iso(next), reason: REASON })})`
        }
        return { email, outcome: 'billing delayed', kind: 'subscriber', sub: liveSub.id, from: iso(baseTs), to: iso(next) }
    }

    // ── PAYWALLED MEMBER: push the access date ────────────────────────────────
    if (!u.sid) return { email, outcome: 'no subscription row — nothing to credit; provision first' }
    const data = parse(u.data)
    const existing = data.renewaldate && data.renewaldate !== 'N/A' ? new Date(data.renewaldate) : null
    const base = existing && !isNaN(existing) && existing > new Date() ? existing : new Date()
    const next = addTime(base.getTime())

    if (!DRY) {
        data.renewaldate = next.toISOString()
        await sql`update user_setting set data = ${JSON.stringify(data)} where id = ${u.sid}`
        await sql`update "user" set migration_type = 'current' where id = ${u.id}`
        await sql`INSERT INTO app_logs (level, event, email, user_id, source, data)
                  VALUES ('info','admin.grant_access',${u.email},${u.id},'claude-tooling',
                          ${JSON.stringify({ days: DAYS, months: MONTHS, from: data.renewaldate ?? null,
                                             to: next.toISOString(), reason: REASON })})`
    }
    return { email, outcome: 'access extended', kind: 'paywalled',
             from: existing ? existing.toISOString().slice(0, 10) : 'none', to: next.toISOString().slice(0, 10) }
}

async function main() {
    if (!DAYS && !MONTHS) { console.error('give --days=N and/or --months=N'); process.exit(1) }
    const one = arg('email')
    const file = arg('emails-file')
    const emails = one ? [one.toLowerCase()]
        : file ? fs.readFileSync(file, 'utf8').split('\n').map(e => e.trim().toLowerCase()).filter(Boolean)
        : []
    if (!emails.length) { console.error('give --email= or --emails-file='); process.exit(1) }

    console.log(DRY ? '=== DRY RUN — no changes ===' : '=== LIVE ===')
    console.log(`credit: ${MONTHS ? MONTHS + ' month(s) ' : ''}${DAYS ? DAYS + ' day(s)' : ''}   reason: ${REASON}\n`)

    const results = []
    for (const e of emails) {
        const r = await creditOne(e)
        results.push(r)
        const detail = r.from ? `${r.from} -> ${r.to}` : ''
        console.log(`  ${e.padEnd(34)} ${String(r.kind || '-').padEnd(11)} ${r.outcome.padEnd(26)} ${detail}`)
    }
    const sub = results.filter(r => r.kind === 'subscriber').length
    const pay = results.filter(r => r.kind === 'paywalled').length
    const bad = results.filter(r => !r.kind).length
    console.log(`\npaying subscribers (billing delayed): ${sub}`)
    console.log(`paywalled members (access extended):  ${pay}`)
    if (bad) console.log(`could not credit:                     ${bad}`)
    if (DRY) console.log('\nNothing was changed. Re-run with --confirm.')
}

main().catch(e => { console.error(e); process.exit(1) })
