# Audit: Derive subscription "Active" status from the expiration date (renewaldate) everywhere

**Scope:** READ-ONLY audit. No code changed except this file.
**Date:** 2026-07-24
**Repo:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`

## The problem in one sentence

"Active / current" is derived in several display and logic paths from the freeform, unreliable
`user_setting.status` TEXT column (and its `data.status` JSON twin). WooCommerce imports stamp it
`'Active'` as a placeholder, manual fixes set `'active'`, and cancellation webhooks/self-heals leave
it stale. It does **not** reflect whether the member actually has access. The reliable signal is the
**expiration date** — `user_setting.data.renewaldate` (future = active, past/missing = expired) —
optionally OR'd with a live Stripe status of `active`/`trialing`. The classifier
(`/api/classifyUsers`) already decides `migration_type` this way; the display/logic paths below do
not, so they disagree with it.

## Schema facts (confirmed in `Drizzle/db/schema.ts`)

- `user_setting.status` — `text("status")` (line 41). Freeform string. **Unreliable.**
- `user_setting.data` — `text("data")` (line 46), holds JSON. **Parse with `JSON.parse`; never `->>`.**
- `user_setting.trial` boolean (49), `stripe_subscription_id` / `authorize_subscription_id` text (55–56).
- `user.migration_type` / `user.customer_segment` — the classifier's renewaldate-derived output.

## Reference implementation (the correct basis, already in the repo)

`app/api/classifyUsers/route.js:9-18` — `parseRenewalDate(rawData)`: `JSON.parse`, read
`data.renewaldate ?? data.nextPaymentDate`, return a `Date` only if it matches `^\d{4}-\d{2}-\d{2}`.
Line 194: `else if (u._renewalDate && u._renewalDate > now) → current / subscriber`. This is the
gateway-less "future renewaldate = active" rule we want everywhere.

---

## Every site that derives active / current / expired status (file:line + current basis)

### A. My Account data layer — `lib/commonFunctions.js` → `getAccountInformation` (the live one used by the page)

| Line | Field | Current basis | Correct? |
|---|---|---|---|
| `:731` | `const activeStatuses = ['active', 'trialing', 'Active']` | literal string set | — |
| `:740-742` | `dbImpInfo.status` | capitalizes the raw `usersettingInfo.status` string (`'active'→'Active'`, `'trialing'→'Trialing'`, null→`'N/A'`) | **raw status string** ❌ |
| `:749` | `dbImpInfo.hasSubscription` | `activeStatuses.includes(usersettingInfo.status)` — raw string membership | **raw status string** ❌ (ignores renewaldate) |
| `:746-747` | `redableNextPaymentDate` / `nextPaymentDate` | `data.renewaldate` | reads the right field, but only for display, not for the active decision |
| `:782-783` | Stripe branch `stripeStatusFormatted` | `stripeStatus === 'active' \|\| 'trialing' ? 'Active' : stripeStatus` | **live Stripe status** ✅ (correct basis) |
| `:793` | Stripe branch `hasSubscription` | `stripeStatus === 'active' \|\| 'trialing'` | **live Stripe status** ✅ |
| `:817` | Auth.net branch | `impInfo = await getFlagAndSubscriptionInfo(authorizeData)` → status derived from `nextPaymentDate < todaysDate` (see D) | date-based ✅ but Auth.net-only |
| `:827,:843` | `migrationStatus` | `userInfo?.migrationType` (renewaldate-derived by classifier) | ✅ correct signal, passed to the component |

**Gateway-less `current` user flow (renewaldate in the future, no stripe/authnet id) — reproduced:**
1. `dbImpInfo` is built from DB (`:733-759`). `status` = capitalized raw `user_setting.status`;
   `hasSubscription` = `activeStatuses.includes(rawStatus)`.
2. Step 2 Stripe enrichment (`:766`) is **skipped** — no `stripeSubscriptionId`.
3. Step 3 Authorize.net (`:808-834`): no `authorizeCustomerId`; the `getAllDataFromFile(email)`
   fallback returns nothing → `resolvedAuthorizeId` undefined → **skipped**.
4. Returns `{ ..., migrationStatus: 'current', impInfo: dbImpInfo }`.

So for these users the returned `impInfo.status` / `impInfo.hasSubscription` are **entirely a function
of the raw `user_setting.status` string, never of `renewaldate`.** If the fix that made them current
set `renewaldate` but left `status` as `null` / `'N/A'` / anything not in `{active, trialing, Active}`,
then `hasSubscription = false` and `status != 'Active'` — and the page renders the **"No Subscription"**
branch + a **Renew** button even though they are genuinely current. That is the reported bug class.
(WooCommerce placeholder `'Active'` happens to pass — but for the wrong reason: it verifies nothing.)

### B. My Account UI — `components/AccountDetailsComp.js`

| Line | Logic | Current basis |
|---|---|---|
| `:97` | `const isActive = impInfo?.status === 'Active' && migrationStatus !== 'noncurrent'` | **status string** (must equal `'Active'`) AND migration_type guard |
| `:98` | `const isTrial = !!impInfo?.trial` | `trial` boolean |
| `:99` | `const hasStripeSub = impInfo?.subscriptionId?.startsWith?.('sub_')` | subscription-id prefix (fine, unrelated to status) |
| `:105` | cancel-UI region shown when `isActive && !isTrial` | via `isActive` |
| `:110` | **Renew button** shown when `!isActive` | via `isActive` |
| `:133` | `impInfo?.hasSubscription ? presentContent : absentContent` (the "No Subscription" card at `:95`) | **`impInfo.hasSubscription`** (from A:749) |
| `:138` | cancel-subscription button `isActive && !isTrial && hasStripeSub` | `isActive` + stripe-id |
| `:174` | cancel-trial button `isTrial && hasStripeSub` | `trial` + stripe-id |
| `:201,:209` | `DisplayOrder` "Status" rows | `impInfo?.status` (raw string, see A:740) |

Note the asymmetry: `isActive` (`:97`) has the `migrationStatus !== 'noncurrent'` guard so an
**expired** user (classifier set `noncurrent`) correctly gets the Renew button — but `hasSubscription`
(`:133`) has **no such guard**, so an expired user whose stale `status` string is still `'Active'`
renders the full subscription-details card **and** a Renew button at the same time (inconsistent).

### C. Admin — user list "Sub" column (raw status string shown to admins)

- `app/api/admin/users/route.js:29` — selects `settingStatus: user_setting.status` (raw string).
- `app/admin/users/UsersClient.js:283-284` — renders it directly:
  `u.settingStatus ? <span className={u.settingStatus === 'active' ? subActive : subInactive}>{u.settingStatus}</span> : '—'`.
  **Basis: raw `user_setting.status` string.** A fixed gateway-less user with `status = null` shows
  `—`; one with stale `'Active'` on an expired account shows a green "active" pill. Misleading either way.
- The list's primary badge (`UsersClient.js:279-280`) uses `customerSegment || migrationType` — that one
  **is** renewaldate-derived (classifier output) and is correct.

### D. Admin — shared subscription panel

- `lib/adminSubscription.js` → `buildSubscriptionSummary(setting, userId)` (used by both
  `/api/admin/users/[id]/route.js:92` and `/api/admin/cases/[id]/route.js:133`):
  - `:17-18` `isStripe`/`isAuthNet` from id presence.
  - `:21-36` live Stripe retrieve → `stripeLive.status` (**live** ✅).
  - `:51` `accessSource = stripe | auth_net | (data.renewaldate ? 'legacy_renewaldate' : 'unknown')`.
  - `:63` `settingStatus: setting.status ?? data.status ?? null` — **the raw string**, passed through
    but (see next) never actually rendered. Effectively dead / a trap for future use.
  - **No boolean "is this access currently valid" is computed from `renewaldate`.**
- `components/admin/SubscriptionSummary.js`:
  - `:69` renders `live.status` (Stripe) with active/trialing coloring — **live** ✅.
  - `:77` renders `sub.renewalDate` as "Renews / expires" for non-Stripe — shows the date but makes **no
    active/expired judgement** and does not compare it to now.
  - `settingStatus` is **not rendered** here at all (confirmed via grep) — computed in the helper, unused.
  - Net: for a gateway-less `legacy_renewaldate` user the admin sees a renewal date but no explicit
    Active/Expired label; nothing keys off the raw status string here (good), but nothing derives active
    from the date either.

### E. Admin — primary user "Status" badge (already correct)

- `app/admin/users/[id]/UserDetailClient.js:260-261`, `app/admin/ticket/[id]/TicketClient.js:250-251`,
  `app/admin/cases/[id]/CaseClient.js:381-382`, plus list badges in
  `InboxClient.js:95-97` / `OutboxClient.js:65-67` / `UsersClient.js:279-280`.
- All render `user.migrationType` (or `customerSegment`) via `migrationClass()` / `<Badge>`. Basis:
  **`migration_type`**, which the classifier derives from `renewaldate` (+ live Stripe recheck).
  **These are already on the correct basis** and need no change beyond staying consistent.
- API list routes that ship `migrationType` to those badges: `api/admin/cases/route.js:28`,
  `api/admin/tickets/route.js:24`, `api/admin/outbound/route.js:21`, `api/admin/users/route.js:26`.

### F. User-facing / cross-project API routes

| Route | Line | Basis | Notes |
|---|---|---|---|
| `app/api/user/renewalStatus/route.js` | `:20` `needsRenewal = user.migrationType === 'noncurrent'` | **migration_type** (renewaldate-derived) ✅ | This is the live paywall check for `my.` — already correct. |
| `app/api/user/accountInformation/route.js` | `:65` `getFlagAndSubscriptionInfo(authorizeData)` | Auth.net date-based (see below) | Legacy POST route; Auth.net-centric. |
| `app/api/user/userStatus/route.js` | — | no status derivation | just reads/writes the raw setting row. |
| `lib/commonFunctions.js` → `getFlagAndSubscriptionInfo` | `:262` `if (nextPaymentDate < todaysDate) status = "Inactive"` else `"Active"` (`:273-276`) | **date-based** ✅ but Auth.net-only | This is the one place that already does exactly what we want — off the payment date. |

### G. Dead / legacy (not wired to the live page — note only, do not touch)

- `lib/commonFunctions.js:59-106` `getFlagAndSubscriptionInfoForNonAuthUsers` — `:78` `status: data?.status`,
  `:103` `hasSubscription: false`. Only called by `getAccountInformationOld` (`:847-906`), which the live
  `app/accountDetails/page.js` does **not** call. Legacy.
- `components/AccountDetailsComp-original.js:297/305/318` (`status == "Active"`) — backup file, not imported.
- `lib/commonFunctions-original.js`, `app/api/migration/route.js:347/662/676` (`status = "Active"` at import
  time) — import/seed writers, not display logic. They *write* the unreliable string; the fix is to stop
  *trusting* it on read, not to change the writers.
- `app/api/paymentPortal/route.js:145` `if (impInfo.status == "active"||"Active")` — legacy Auth.net portal.
- `app/api/stripe/create-subscription/route.js:67` `status: 'Active'` — writes the string on new sub (fine).

---

## Proposed shared helper — `lib/subscription.js`

Single source of truth. Base "active" on a **future renewaldate OR a live Stripe `active`/`trialing`**.

```js
// lib/subscription.js

// Mirror of classifyUsers parseRenewalDate — accept a raw JSON string, a parsed
// data object, or a date string; return a Date or null.
export function parseRenewalDate(input) {
  let raw = input;
  if (typeof input === 'string' && input.trim().startsWith('{')) {
    try { input = JSON.parse(input); } catch { input = null; }
  }
  if (input && typeof input === 'object') raw = input.renewaldate ?? input.nextPaymentDate;
  if (raw && typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return new Date(raw);
  if (raw instanceof Date && !isNaN(raw)) return raw;
  return null;
}

// THE decision. renewaldate: string|Date|null; stripeStatus: live Stripe status|null.
export function isSubscriptionActive({ renewaldate, stripeStatus, now = new Date() } = {}) {
  const d = parseRenewalDate(renewaldate);
  const dateActive   = !!(d && d > now);
  const stripeActive = stripeStatus === 'active' || stripeStatus === 'trialing';
  return dateActive || stripeActive;
}

// Optional display label.
export function subscriptionStatusLabel({ renewaldate, stripeStatus, trial, now } = {}) {
  if (isSubscriptionActive({ renewaldate, stripeStatus, now })) {
    return (trial || stripeStatus === 'trialing') ? 'Trial' : 'Active';
  }
  return 'Expired';
}
```

Signature to standardize on: **`isSubscriptionActive({ renewaldate, stripeStatus })` → boolean**, plus
`subscriptionStatusLabel(...)` for the string. Keep `parseRenewalDate` identical in spirit to the
classifier's so the two never diverge (or export the classifier's copy from here and import it there —
a later refactor, out of scope for this audit).

---

## Exact call-sites to switch to the helper

1. **`lib/commonFunctions.js:749`** (DB branch `hasSubscription`)
   `hasSubscription: activeStatuses.includes(usersettingInfo.status)`
   → `hasSubscription: isSubscriptionActive({ renewaldate: data?.renewaldate })`.

2. **`lib/commonFunctions.js:740-742`** (DB branch `status` label)
   → `status: subscriptionStatusLabel({ renewaldate: data?.renewaldate, trial: usersettingInfo.trial })`
   (drop the raw-string capitalization). Consider also returning an explicit
   `isActive: isSubscriptionActive({ renewaldate: data?.renewaldate })` on `dbImpInfo` so the component
   consumes a server-computed boolean instead of string-matching.

3. **`lib/commonFunctions.js:783,793`** (Stripe branch) — already correct; optionally route through the
   helper for uniformity: `hasSubscription: isSubscriptionActive({ stripeStatus })` and
   `status: subscriptionStatusLabel({ stripeStatus, trial: stripeStatus === 'trialing' })`. Behaviour
   unchanged. If you add `impInfo.isActive` (item 2), set it here too from `stripeStatus`.

4. **`components/AccountDetailsComp.js:97`**
   `const isActive = impInfo?.status === 'Active' && migrationStatus !== 'noncurrent'`
   → prefer consuming a server flag: `const isActive = impInfo?.isActive ?? (migrationStatus !== 'noncurrent')`.
   If you keep it client-derived, base it on `impInfo.hasSubscription` (now renewaldate-derived) instead
   of the `status` string. Keep the `migrationStatus !== 'noncurrent'` guard as a belt-and-suspenders
   agreement with the classifier. Gates at `:105/:110/:138` then follow automatically.

5. **`components/AccountDetailsComp.js:133`** — no change if `impInfo.hasSubscription` is fixed at source
   (item 1). This is what flips the 104 users off the "No Subscription" card.

6. **`app/api/admin/users/route.js:29` + `app/admin/users/UsersClient.js:283-284`** (admin list "Sub"
   column) — stop shipping/showing raw `user_setting.status`. Either compute
   `isSubscriptionActive({ renewaldate: <parsed from setting.data>, stripeStatus: <n/a in list> })`
   server-side and show `Active/Expired`, or drop the column and rely on the already-correct
   segment/migration badge at `:279-280`. (No live Stripe call in the list — the future-renewaldate
   date test covers gateway-less users; genuine Stripe users already carry a self-healed future
   renewaldate from the classifier, so date-only is sufficient here.)

7. **`lib/adminSubscription.js:63` + `components/admin/SubscriptionSummary.js:77`** — add a helper-derived
   `isActive` to the summary (`isSubscriptionActive({ renewaldate: data.renewaldate, stripeStatus:
   stripeLive?.status })`) and render an explicit **Active / Expired** label next to the renewal date.
   Either use `settingStatus` for this (currently computed-but-unrendered) or remove it to avoid the trap.

8. **(No change) `app/api/user/renewalStatus/route.js:20`** and all `migration_type`/`customer_segment`
   badges (section E) — already renewaldate-derived through the classifier. Leave as-is for consistency.

9. **(No change) `app/api/classifyUsers/route.js`** — stays authoritative and is the pattern the helper
   copies. Do **not** re-point it at the helper in this pass (risk of behavioural drift on the nightly
   cron); at most, later, have both import one `parseRenewalDate`.

---

## Confirmation of the two required scenarios

**104 fixed users (future `renewaldate`, no gateway id):**
- **My Account, today:** correct *only by luck* — shows Active iff their raw `status` string is in
  `{active, trialing, Active}`. Any fixed user left with `status = null/'N/A'/other` currently renders
  **"No Subscription" + Renew** despite being current (`getAccountInformation:749` → `AccountDetailsComp:133/110`).
  **After the helper:** `hasSubscription`/`isActive` come from the future `renewaldate` → **Active**,
  no Renew button, no cancel button (they have no `sub_` id, which is correct — nothing to self-cancel). ✅
- **Admin, today:** the primary Status **badge** is already right (`migration_type = current`, set by the
  classifier from the future renewaldate). The **list "Sub" column** (`UsersClient:283`) is wrong/blank
  because it shows the raw string. **After the helper:** the "Sub" column also reads Active from the date. ✅

**Actually-expired user (`renewaldate` in the past):**
- **My Account, today:** `isActive` is false (classifier set `migration_type = noncurrent`, and the
  `:97` guard catches it) → **Renew** shows (correct). But `hasSubscription` (`:133`, no guard) can still
  be `true` off a stale `'Active'` string → the subscription-details card **and** the Renew button show
  together (inconsistent). **After the helper:** past `renewaldate` (and no live Stripe active) →
  `hasSubscription = isActive = false` → clean **"No Subscription" + Renew**, no stale details. ✅
- **Admin, today:** badge = `noncurrent`/`lapsed` (correct); list "Sub" column may show stale `active`
  (misleading). **After the helper:** shows **Expired**. ✅

---

## Side-effect risks to flag before implementing

- **Renew button (`AccountDetailsComp:110`)** — broadening `isActive` to future-renewaldate users hides
  the Renew button for the 104 (intended). Verify no genuinely-expired user is swept in: they aren't,
  because a past date fails the test and the `migrationStatus !== 'noncurrent'` guard still applies.
- **Cancel / Cancel-trial buttons (`:138`,`:174`)** — gated on `hasStripeSub` (id prefix), independent of
  the status basis, so unchanged. Gateway-less "active" users still get no cancel button (correct — a
  manual grant has nothing to cancel in Stripe).
- **Expired-with-stale-`'Active'` users** — switching `hasSubscription` to the date basis will visibly
  flip them from a details card to "No Subscription". This is the intended correction but is a *visible*
  change for that cohort; worth a spot-check/count before shipping.
- **Stripe users with a stale cached `renewaldate`** — keep live Stripe status as an **OR** term so they
  never falsely read Expired on the account page. `getAccountInformation`'s Stripe branch already fetches
  the live sub; feed its `status` into the helper. The admin list (item 6) has no live call — but the
  classifier self-heals Stripe users' `renewaldate` to the real period end, so the date test suffices there.
- **Classifier consistency** — do not change `/api/classifyUsers` in this pass. It already produces the
  renewaldate-based `migration_type` the badges rely on; the goal is to make the *other* reads agree with
  it, not to fork its logic. If `parseRenewalDate` is later shared, both must stay byte-for-byte equivalent.
- **Writers still stamp the string** — `create-subscription`, `grant-access`, migration importers keep
  writing `status`/`data.status`. That's fine; after this change nothing *reads* it as the source of
  truth. `grant-access` also writes a future `renewaldate`, so grant-access'd users are already covered
  by the new basis.
```
