# Session: SiteDownClientHold

- **Session name:** SiteDownClientHold
- **Session ID:** `82b8cae0-2b09-4ba3-8ed2-f7d77be23818`
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date:** started 2026-08-11 (outage diagnosis); notes taken 2026-08-13
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/82b8cae0-2b09-4ba3-8ed2-f7d77be23818.jsonl`
- **Other data dirs touched:** none (no code, no DB, no plans written this session)

## Goal
User reported: **"site is down seemingly all urls."** Diagnose the outage.

## Outcome — DIAGNOSED (not an app/AWS problem)

**Root cause: the domain `gymnasticbodies.com` is on `clientHold` at the registrar (easyDNS), applied the morning of 2026-08-11.** `clientHold` tells the .com registry to pull the domain out of DNS entirely, so *every* hostname (www, app, apex, mail, api, forum) stops resolving at once. This is a registrar/registration problem, **above** our infrastructure — nothing in the codebase, Vercel, Neon, or AWS is broken.

### Evidence gathered
1. `curl` to all three prod hosts → HTTP `000`, curl exit code 6 (**could not resolve host**), while `https://www.google.com` returned 200 → local internet/DNS fine, the domain specifically doesn't resolve.
2. `drill gymnasticbodies.com NS` (via 8.8.8.8 and local) → **no delegation returned**; the `.com` TLD answers with only the `com.` SOA. That's the signature of a domain **un-delegated at the registry level** (hold/expiry), not a zone-behind-nameservers failure.
3. `whois gymnasticbodies.com`:
   - **Domain Status: `clientHold`** (plus `clientTransferProhibited`, `clientUpdateProhibited`)
   - **Registrar: easyDNS Technologies Inc.** (abuse: `abuse@easydns.com`, +1.416.535.8672)
   - **Registry Expiry: 2027-08-10** → domain is **NOT expired**
   - **Updated: 2026-08-11T08:03:38Z** → hold flipped **that morning**, ~30 min before diagnosis
   - **Creation Date: 2007-08-10** (domain turned 19 the day before the hold)
   - **Nameservers: unchanged** — the four AWS Route 53 ones (`ns-342.awsdns-42.com`, `ns-865.awsdns-44.net`, `ns-1171.awsdns-18.org`, `ns-1825.awsdns-36.co.uk`)
   - **Registrant: Christopher Sommer / Olympic Bodies LLC**; registrant/admin/tech **emails REDACTED FOR PRIVACY** — not recoverable from WHOIS.

### Why the user's "failure to pay AWS" theory is wrong
Unpaid AWS/Route 53 would leave the delegation intact (you'd get the AWS nameservers back, then the zone behind them would fail). Here the AWS nameservers are still correctly registered; the domain is suppressed **at easyDNS**, above them. Route 53 is fine.

### Likely reason for the hold (domain not expired, so):
1. **Billing problem at easyDNS** — failed renewal/auto-renew charge or bad card on file. Note the timing: created 08-10, renews 08-10 each year, hold landed 08-11 — one day after this year's renewal anniversary. Most likely a renewal-cycle billing event. **This is the "failure to pay" instinct — but it's the domain registrar bill, not AWS.**
2. **ICANN WHOIS / registrant-verification failure** — an unanswered "verify your email" notice auto-triggers a hold.
3. Abuse/legal complaint (less likely given the anniversary timing).

## What only the user can do (outside the code)
Cannot be fixed from this machine — the hold lives in the easyDNS account.
1. Log into **easyDNS** (https://cp.easydns.com) → check domain status, unpaid invoices, verification notices.
2. If billing: pay / fix card → easyDNS typically lifts `clientHold` shortly after.
3. If unclear: contact easyDNS support with the domain, ask why `clientHold` was placed 2026-08-11.
4. Check the **contact email on file at easyDNS** for a notice dated 2026-08-11 — the reason is almost certainly there.
5. **Ownership flag:** registrant is Christopher Sommer / Olympic Bodies LLC. If the easyDNS account + its billing card + notice inbox sit on Sommer's side rather than the user's, the renewal/verification notice may have gone to an inbox the user doesn't control — which explains a hold appearing with no warning on our end.

Once easyDNS removes `clientHold`, the registry re-adds the delegation and the site returns on its own (propagation up to ~1 hr, often faster). No redeploy, no DNS edits on our end.

## Git / Vercel / DB
None. No commits, no deploys, no DB writes, no env changes this session. Working tree unchanged by this session (pre-existing uncommitted `M .gitignore`, `M CLAUDE.md`, `M app/admin/inbox/InboxClient.js` are from other work, untouched here).

## Tools used
Bash (`curl`, `drill`, `whois`), Read of context. No browser, no MCP, no subagents.

## First user inputs
1. "site is down seemingly all urls."
2. (mid-turn) "Where is the domain registered. I think this could be a failure to pay AWS."
3. "Whats the registration date."
4. "Any registration emails listed?"
5. "take session notes."

## First command run
`for u in <3 prod hosts>; do curl -s -o /dev/null -w ... "$u"; done` (HTTP status check) — returned all `000`.

## Note for Next Session

**The whole site went dark on 2026-08-11 because `gymnasticbodies.com` is on `clientHold` at easyDNS — a registrar hold, NOT an app/Vercel/Neon/AWS failure.** The domain is not expired (registry expiry 2027-08-10); the AWS Route 53 nameservers are still correctly delegated. `clientHold` yanks the domain from DNS at the .com registry, so all hostnames fail to resolve simultaneously — that "everything down at once" pattern is the tell.

Diagnosis is complete but **the fix is the user's to make in the easyDNS account** — it cannot be done from this machine or the codebase. When picking this back up, first check whether the site is resolving again:

```
whois gymnasticbodies.com | grep -i "domain status"     # is clientHold gone?
drill @8.8.8.8 gymnasticbodies.com A                     # does it resolve yet?
```

- If `clientHold` is **cleared** and it resolves → outage over, nothing to deploy; just confirm www/app/apex all load.
- If still on hold → the user needs to log into **https://cp.easydns.com**, find the reason (most likely a failed renewal charge — hold landed one day after the 08-10 renewal anniversary; second guess is an ICANN email-verification lapse), pay/verify, and easyDNS lifts it. Contact: `abuse@easydns.com` / +1.416.535.8672.
- **Watch the ownership angle:** registrant is Christopher Sommer / Olympic Bodies LLC. If the easyDNS login, billing card, and notice inbox belong to Sommer's side, the renewal/verification notice went somewhere the user may not control — worth confirming who actually holds the easyDNS account so this doesn't silently recur next August.

Session file: `app.gymnasticbodies.com/sessions/SiteDownClientHold.md`.
