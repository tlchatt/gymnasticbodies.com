# Forum OFF-AWS Migration Plan

**Date:** 2026-09-22 · **Status:** INVESTIGATION + PLAN ONLY — nothing changed, no DNS/infra touched.
**Goal (owner's real intent):** get the community forum **off AWS** so an AWS billing suspension can
never take it down again. "Move it to Vercel" is shorthand for "off AWS" — **Vercel is serverless and
cannot run a PHP+MySQL Invision forum**, so the forum application itself must go to a real
PHP/MySQL host. This plan evaluates realistic off-AWS targets and recommends one.

---

## 1. What the forum actually is (measured, not assumed)

| Fact | Value | How verified |
|---|---|---|
| Software | **Invision Community 4.x** (IPS4) | `ips4_` CSS classes + `ips4_IPSSessionFront` cookie on live HTML |
| PHP runtime | **PHP 7.2.34** (EOL since Nov 2020) | `X-Powered-By` header on live origin |
| Web server | Apache | `Server:` header |
| DB engine | **MariaDB 10.11**, mixed MyISAM + InnoDB | dump header |
| DB name / cPanel user | `goatfart_forum40` / cPanel account **`goatfart`** | dump header + backups manifest |
| DB size | **3.36 GB** uncompressed (533 MB gz), **312 tables** | `gzip -l`, table count |
| Members | **~42,981** (max `core_members` id) | `AUTO_INCREMENT` in dump |
| Forum posts | **~282,845** across **~37,419 topics**, **124 subforums** | `AUTO_INCREMENT` |
| Private messages | **~63,583** PM posts / **45,006** PM topics | `AUTO_INCREMENT` |
| Reputation entries | ~124,371 · Search index ~273,933 rows | `AUTO_INCREMENT` |
| Attachments (uploaded files) | **~5,670** — **live on disk, NOT in the DB dump** | `core_attachments` count |
| Activity recency | Front page shows posts up to **~2026-07-21** (≈2 months stale as of today); date spread 2020→2026 | live HTML scrape |

**Read:** this is a **real, established, but low-velocity** community — a couple hundred thousand
historical posts and 40k+ member records, still receiving occasional new posts (last activity ~2
months ago). It is **not** a throwaway/dead board, and it is **not** a high-traffic hot property.
That mid-point drives the recommendation: worth preserving fully and keeping writable, but not worth
a heavy re-platform.

---

## 2. Where it lives on AWS + what it costs

- **AWS Lightsail** instance `cpanel-new-2026`, account `390008123206`, us-east-1a.
  Blueprint `cpanel_whm_almalinux`, bundle **`2xlarge_3_0` = 8 vCPU / 32 GB RAM / 640 GB SSD /
  7 TB transfer = $164/mo (~$1,968/yr)**. Created 2026-05-04.
- IP **34.205.92.109** is the instance's **default public IP — NOT a Lightsail static IP** (confirmed:
  `get-static-ips` returned none). It survives while the instance runs but **changes on any
  stop/start**. The reverse proxy hardcodes it → a fragility to fix regardless of host.
- **Full-box Lightsail snapshots exist:** `gymnasticbodies-cpanel-final-20260817` and
  `cPanel-WHM-Linux-1-final-20260817` (both 640 GB, 2026-08-17, `available`). These are complete
  filesystem images — IPS app files, `/uploads`, `conf_global.php`, mail, cron — everything.
- A second instance `cPanel_WHM_for_Linux-1` is **stopped** (the old box; the forum was already
  cPanel-migrated old→new within AWS in May 2026 — so the team has done a cPanel transfer before).
- The box was originally sized for 5 WordPress sites + WooCommerce + the forum. **The WP sites are
  already off (Vercel/Neon).** The forum is the ONLY thing still needing this box, so its real
  resource need is a fraction of the current 8 vCPU / 32 GB.

**This box is the last live AWS dependency for the whole GB platform.** If account `390008123206`
is suspended again (as it was 2026-09-21), the forum goes dark exactly like CloudFront/S3/ELB did.

---

## 3. How it's served to users today

`www.gymnasticbodies.com/forum/*` → Vercel Next.js route
`app.gymnasticbodies.com/app/forum/[[...path]]/route.js` → an HTTPS reverse proxy that connects to
**34.205.92.109** with SNI + `Host: www.gymnasticbodies.com` forced (the origin's Apache only serves
the forum when Host = www, and forcing it avoids a canonical-redirect loop). **Any relocation only
needs `ORIGIN_IP` (and possibly the forced Host) changed in this one file** — the public URL,
DNS, and user experience stay identical. This proxy indirection is a big advantage: the forum's
public address is decoupled from where it's actually hosted.

---

## 4. Dependencies to carry in ANY move

1. **MySQL/MariaDB DB** `goatfart_forum40` (3.36 GB) — we have a 2026-07-24 dump locally; take a
   **fresh** dump at cutover.
2. **IPS application files** — the whole `/home/goatfart/public_html/forum` (or docroot) tree.
   **NOT in any local backup** — only on the box / in the Lightsail snapshot.
3. **`/uploads`** — 5,670 attachments + member photos + theme resources + emoticons.
   **NOT in the DB dump** — on disk only. Size unmeasured (no shell yet); measure first.
4. **`conf_global.php`** — DB creds, cookie/salt keys, **and the IPS license key**. On disk only.
5. **`datastore` / cache dirs**, cron entry (IPS runs a task cron), and any custom theme/apps
   (the `HQ_`-prefixed badge tables suggest at least one third-party app is installed).
6. **Email** — IPS sends notification/registration mail. Currently via the cPanel box's mail or an
   SMTP config in ACP. On any new host, point IPS SMTP at an existing provider (SendGrid is already
   in the platform) so mail keeps working.
7. **TLS** — the origin currently presents a `www.gymnasticbodies.com` cert. On a new host we can
   either keep faking Host=www (needs a matching cert) or, cleaner, give the forum its own hostname.

**Access gap (blocker to resolve first):** our `~/.ssh/id_ed25519` is **not** authorized on the box
(root SSH = "Permission denied (publickey)"). To pull the filesystem we need one of: the Lightsail
instance `.pem` key (via `aws lightsail download-default-key-pair` or `get-instance-access-details`),
WHM root login, or cPanel login for `goatfart`. **Confirm we have this before scheduling a cutover.**

---

## 5. Off-AWS options

### (a1) cPanel → cPanel lift-and-shift to a non-AWS cPanel host  ⭐ RECOMMENDED
Take a full cPanel account backup of `goatfart` (WHM "Backup" / `pkgacct`, or WHM Transfer Tool) and
restore it 1:1 on a cPanel/WHM box at any non-AWS provider (Hetzner+cPanel, Krystal, A2, Namecheap
VPS, KnownHost, or a small managed cPanel VPS). Because source and target are both cPanel, the
restore reproduces **the exact PHP 7.2 runtime, paths, DB, uploads, mail, and cron** with no
reconfiguration and **no IPS upgrade / license renewal required to keep running**.
- **Pros:** lowest risk & effort; identical environment; nothing in the forum changes; team has done
  a cPanel transfer before; cheaper than $164/mo (forum-only needs a small box); reversible.
- **Cons:** carries the EOL PHP 7.2 + old IPS forward (security debt unchanged — see §7); a cPanel
  license adds ~$15-45/mo (bundled on some hosts).
- **Effort:** ~0.5-1 day hands-on + DNS/proxy repoint. **Cost:** ~$20-60/mo all-in (vs $164 now).

### (a2) Plain VPS (Hetzner / DigitalOcean / Linode), no cPanel
Provision a Linux VPS, install Apache/nginx + PHP + MariaDB, restore the DB, rsync the IPS files +
`/uploads`, edit `conf_global.php`, set the IPS cron + SMTP + TLS (Let's Encrypt).
- **Pros:** cheapest (Hetzner CX22 ~€4/mo; DO/Linode $12-24/mo); no cPanel license; full control.
- **Cons:** must hand-build the LAMP stack; IPS 4.5-era wants PHP 7.2-7.4 — you'd run PHP 7.4 (also
  EOL but works) or be forced to upgrade IPS to reach PHP 8; more moving parts to get right (mail,
  cron, cert). No cPanel safety net.
- **Effort:** ~1-2 days. **Cost:** ~$5-24/mo.

### (b) Invision Community **Cloud** (official managed hosting)
Invision hosts, patches, backs up, and CDNs the forum; they run the self-hosted → Cloud migration.
- **Pros:** zero server ops; always patched; off AWS by definition; Invision does the migration.
- **Cons:** **recurring ~$50-100+/mo**; **gated on an active IPS license** and typically on being
  **current** — they will likely force an upgrade off 4.5 to latest (4.7/5.x), which can break the
  current theme and any third-party app (e.g. the `HQ_` badge app); least control (no arbitrary PHP);
  possible URL-structure changes needing redirect mapping through the proxy.
- **Effort:** low-medium *if* the license is active and an upgrade is acceptable; otherwise blocked.
  **Cost:** recurring subscription, highest ongoing of the realistic options.

### (c1) Freeze to a **static archive** on Vercel/Blob (insurance / sunset only)
Crawl the whole forum (`wget --mirror` / httrack) → static HTML → host on Vercel or Vercel Blob.
- **Pros:** truly off-AWS, near-$0, indestructible, nothing to patch, keeps all content readable and
  Google-indexed forever; can sit **behind the same `/forum` proxy** (point it at the static host).
- **Cons:** **kills the living forum** — no new posts, no logins, no PMs, no working search/registration.
  The board still had posts ~2 months ago, so this is a **product decision to sunset**, not just a
  technical move. Good as a **fallback/insurance snapshot** even if we keep a live forum.
- **Effort:** ~0.5-1 day to crawl 37k topics. **Cost:** ~$0.

### (c2) Re-platform to **Discourse** on a non-AWS host
Use Discourse's official IPS4 importer; run Discourse (Docker) on Hetzner/DO or Discourse-managed.
- **Pros:** modern, actively maintained, no EOL-PHP debt; free self-host or managed.
- **Cons:** **high effort + high user disruption** — new UI, new login/SSO, changed URLs (SEO/link
  breakage unless every old URL is redirect-mapped), importer fidelity gaps (PMs, reputation, custom
  fields, `HQ_` app data, some attachments may not carry cleanly). Overkill for a low-traffic legacy
  community unless the owner specifically wants to modernize.
- **Effort:** several days-plus. **Cost:** $5-24/mo self-host, or managed Discourse ~$100/mo.

### (d) Keep on AWS, harden billing (does NOT meet the goal)
Add a reliable payment method + billing alarms + a second contact on account `390008123206`.
- **Pros:** zero migration. **Cons:** **still on AWS → still suspendable**; the exact risk we're
  removing. Only useful as a **cheap interim safety net** while a real move is scheduled.

---

## 6. RECOMMENDATION — Primary path: (a1) cPanel → cPanel lift-and-shift

It is the only option that **fully meets the goal (off AWS), keeps the forum live and writable,
changes nothing users see, needs no license renewal or risky IPS upgrade, and is cheaper than
today** — while being the lowest-risk and fastest to execute. Static archive (c1) is worth taking
**as a free insurance snapshot** in parallel regardless. A one-time IPS+PHP upgrade (§7) is a
recommended **Phase 2** after the box is safely off AWS, not a blocker to the move.

### Concrete step list (execute ONLY after explicit approval)

**Phase 0 — Prerequisites / decisions (get these before scheduling)**
1. **Confirm access:** obtain the Lightsail `.pem` (`aws lightsail get-instance-access-details`
   / `download-default-key-pair`) OR WHM-root / cPanel-`goatfart` credentials. Without this we
   cannot pull the filesystem.
2. **Confirm the IPS license status** (ACP → Support, or `conf_global.php`). Active vs lapsed decides
   whether Phase 2 (upgrade) or option (b) are even possible. Lift-and-shift itself does **not**
   require an active license.
3. **Owner picks the target host** (recommend a small managed cPanel VPS; a plain Hetzner VPS if
   avoiding the cPanel license) and whether to keep the `/forum` proxy or give the forum its own
   hostname (e.g. `forum.gymnasticbodies.com` with its own Let's Encrypt cert — removes the Host=www
   hack and the hardcoded-IP fragility).

**Phase 1 — Stage on the new host (no user impact, forum stays live on AWS)**
4. Measure real footprint on the box first: `du -sh` the forum docroot + `/uploads` + DB, so the
   target is sized correctly.
5. Take a **fresh** full cPanel account backup of `goatfart` (`pkgacct` / WHM full backup) →
   download off AWS. (Also keep the Aug-17 Lightsail snapshot as a second restore source.)
6. Restore the account on the new cPanel host (WHM Transfer Tool or restore the `pkgacct` archive).
   Verify PHP 7.2 (or 7.4) is selectable there; install matching PHP extensions IPS needs
   (gd, intl, mysqli/pdo, curl, xml, mbstring, zip, openssl).
7. Point IPS SMTP at an existing provider (e.g. SendGrid — already in the platform) so mail works.
8. Re-establish the **IPS task cron** on the new host.
9. **Test on a temp hostname** (hosts-file override or the new host's IP with Host=www forced, exactly
   like the current proxy): browse topics, view attachments/images, log in, post to a test topic,
   run ACP → Support health check. Confirm uploads render (they come from `/uploads`, so this proves
   the filesystem copied correctly).

**Phase 2 — Cutover (small, reversible)**
10. Freeze writes briefly (optional: ACP → offline mode) and take a final DB dump + `/uploads`
    rsync delta to the new host so no posts are lost.
11. Repoint the reverse proxy: change `ORIGIN_IP` (and Host handling) in
    `app.gymnasticbodies.com/app/forum/[[...path]]/route.js` to the new host, deploy to Vercel.
    (If the forum got its own hostname, point that DNS record — on the Vercel-managed
    `gymnasticbodies.com` zone in the `technologicdigitalservices` team — at the new host and adjust
    the proxy/cert accordingly.)
12. Bring the forum back online; smoke-test `www.gymnasticbodies.com/forum/` end-to-end (browse,
    login, attachment, post, search).

**Phase 3 — Decommission AWS (only after a soak period)**
13. Leave the Lightsail box + Aug-17 snapshots untouched for a rollback window (e.g. 2-4 weeks).
14. Once confident, **delete the Lightsail instance `cpanel-new-2026` and the stopped
    `cPanel_WHM_for_Linux-1`**, ending the last AWS dependency and the $164/mo charge. Keep one
    snapshot archived (or the local cPanel backup) as cold insurance. **This deletion is
    destructive/irreversible → explicit owner go-ahead required at that moment (not implied by
    approving the plan).**

**Parallel, anytime — free insurance:** run a full static crawl (option c1) of the forum now and
stash it (Vercel/Blob or local). If anything ever goes wrong, the whole forum is still readable.

---

## 7. Risks / notes to carry forward

- **EOL software debt (independent of hosting):** PHP 7.2 (EOL 2020) + IPS 4.5-era on the public
  internet is a standing security exposure. Lift-and-shift **preserves** it. Strongly recommend a
  **Phase 2 one-time upgrade** to current IPS (4.7 latest / or evaluate IPS 5) on PHP 8.x once the
  box is safely off AWS — **requires an active IPS license**, so resolve the license question early.
- **Hardcoded origin IP** in the proxy is fragile (the IP is not static and changes on stop/start).
  Fix during cutover by giving the forum a stable hostname + its own cert, or at minimum a static IP
  on the new host.
- **Uploads size is unmeasured** (no shell yet) — measure before sizing the target; the DB is only
  3.36 GB but attachments/media could add materially.
- **Third-party IPS app(s)** present (the `HQ_` badge tables) — fine for a lift-and-shift, but a risk
  for options (b) Cloud and (c2) Discourse, which may not carry them.
- **All local backups are DB-only** — a lift-and-shift is **not** possible from what's on this machine
  alone; the filesystem must come from the box or the Lightsail snapshot. Do not assume the local
  `forum_backup_2026-07-24/` is sufficient.
- The exact IPS minor version should be read from ACP → Support during Phase 0 to finalize the
  PHP-version/target-host decision (inferred 4.5-era from PHP 7.2 compatibility).

---

## 8. One-line answer

Take a full cPanel backup of the `goatfart` account off the Lightsail box and restore it on a small
non-AWS cPanel VPS, then repoint the one-line origin IP in the `/forum` reverse proxy — the forum
stays live, unchanged to users, cheaper than $164/mo, and no longer dies if AWS is suspended.
**Blocker to clear first: server access (Lightsail `.pem` / WHM creds) and the IPS license status.**
