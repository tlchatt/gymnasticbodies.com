# Session: AWSMigrationsForum

- **Session ID:** `54bd8405-8b03-4ac4-9c92-2f7c25975c3e`
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date:** 2026-09-21 → 2026-09-22
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/54bd8405-8b03-4ac4-9c92-2f7c25975c3e.jsonl`
- **Data written this session:** Neon (GB DB) tables `forum_categories`, `forum_topics`, `forum_posts`; Vercel Blob (my. images); DNS (Vercel zone).

## Two arcs this session
### Arc 1 — `my.` migrated fully OFF AWS (DONE, live)
The AWS account (`390008123206`) was **suspended (billing — S3 `AllAccessDisabled`)** on 2026-09-21,
taking down CloudFront (`my.` hosting) + S3 (images) + the `api.` ELB at once. Response:
- Put a maintenance banner on `my.` (Vercel), then when AWS came back, migrated `my.` fully off AWS:
  - **Hosting → Vercel** project `my-gymnasticbodies` (pre-built static bundle, NOT git-linked; deploy = `nvm use 16 && yarn build` → `cd build && npx vercel deploy --prod`). DNS `my.` CNAME → `cname.vercel-dns.com`.
  - **Images → Vercel Blob** (`6z1gtynqfxcjjwix.public.blob.vercel-storage.com`): mirrored all 1,192 objects of the `gymfit-images` S3 bucket 1:1 (`aws s3 sync`), swapped the image host across source + bundle. 0 S3 refs remain.
  - Added a Neon `missedlog` view + `log-missed` op to `app/api/user/workout/thrive/route.js` (the only my. component with an AWS call — `MissedDays.jsx`, which is actually commented-out/tree-shaken, so my. was already effectively off AWS). Committed + deployed.
- **Verified:** my. serves the real app with images from Blob; AWS-dependency audit → `claudePlans/my-aws-dependency-audit.md`. Docs updated (monorepo + my. CLAUDE.md).
- **Commits:** my. `b787b3b` (image host), `4124d6c` (MissedDays); app. `c2cfbb3` (thrive endpoint, pushed → Vercel).

### Arc 2 — Forum → read-only public archive (IN PROGRESS — this is the handoff)
Replace the AWS-hosted Invision forum with a **read-only, public** recreation on Vercel+Neon,
**preserving URLs** (primary SEO goal), **GB dark/orange theme** (owner's call). Plan:
`claudePlans/forum-readonly-recreation-plan.md`.

**Phase 1 (ETL) — DONE.** Parsed the frozen dump into Neon:
- Source (frozen, NOT updated — confirmed by owner): `forum_backup_2026-07-24/goatfart_forum40.sql.gz` (IPS4, 3.36 GB).
- Loaded: **52 categories** (`forum_categories`), **32,395 public topics** (`forum_topics`, `approved=1 AND NOT spam`; 89.4M total views), **271,209 posts** (`forum_posts`).
- **Spam cleaned:** the porn/SQLi injection was **dating/escort bot spam** (in `<a href>` URLs + titles, NOT porn keywords — search HREFS, not stripped text!). Found 4 topics, flagged `spam=true`: `t37412 "private women online"` (was approved=1, THE front-page sex link → now excluded), + 3 already mod-deleted. Only spam domain in all 271k posts: `privateladyescorts.com`.
- ETL tools (in `claudeTools/`): `forumEtl.js` (`topics|posts|forums` modes; MySQL-tuple parser + spam filter), `forumLinkAudit.js` (href domain audit), `forumSpamScan.js` (dating/escort spam scan).

**Neon schema (created, owner-approved):**
- `forum_categories(id, parent_id, title, seo_slug, position, is_public)` — names from IPS `core_sys_lang_words` key `forums_forum_{id}`.
- `forum_topics(tid, forum_id, title, seo_slug, starter_name, start_date, views, post_count, approved, pinned, state, first_pid, spam)`.
- `forum_posts(pid, tid, author_name, post_date, html, spam)`.

**URL structure to PRESERVE:** `/forum/` (index), `/forum/forums/{id}-{seo_slug}/` (forum), `/forum/topic/{tid}-{seo_slug}/` (topic + posts). Match by **numeric id** (slug cosmetic; canonical to exact slug). Reader query = `approved=1 AND NOT spam`.

## Note for Next Session (snapshot as of 2026-09-22)

**Pick up the FORUM read-only archive at Phase 2.** Everything below is the state as of 2026-09-22.

**What's DONE:** `my.` is fully off AWS (live). Forum **Phase 1 (ETL) is complete** — all forum data
is in Neon (`forum_categories` 52, `forum_topics` 32,395 public, `forum_posts` 271k), spam excluded.
Full context + schema + URL rules are above in this file, and in `claudePlans/forum-readonly-recreation-plan.md`.

**Phase 2 — BUILD THE READER (next):** a **read-only, public, GB dark/orange themed** reader in
`app.gymnasticbodies.com` that renders from Neon at the **exact preserved URLs**:
- `app/forum/page.js` (index: categories grouped by parent, `is_public` only)
- `app/forum/forums/[slug]/page.js` (a forum's topics, paginated; `slug` = `{id}-{seo}`, match numeric id)
- `app/forum/topic/[slug]/page.js` (topic + its posts read-only; `slug` = `{tid}-{seo}`, match tid)
- Server-rendered HTML for SEO, per-topic `<title>`/meta, `rel=canonical` to the exact slug, `/forum/sitemap.xml`.
- Query filter everywhere: `approved=1 AND NOT spam` (topics), `NOT spam` (posts).
- Use the GB design tokens/theme (dark `#0e0e0e` / orange `#f05621`, Barlow Condensed + DM Sans — see `app/globals.css`, `lib/fonts.js`).
- **Do NOT remove the current AWS proxy `app/forum/[[...path]]/route.js` yet** — build/test the reader on a **preview deploy** so the live forum keeps working until deliberate cutover (Phase 5).

**Phase 3:** URL map — preserve kept topics/forums, **301** pruned to parent, **410** the 4 spam topics + legacy `index.php?/…` → clean URL. Nothing 404s.
**Phase 4:** attachments — 5,670 `/uploads` files live ONLY on the Lightsail box (`cpanel-new-2026`, `34.205.92.109`, reachable via AWS CLI: `aws lightsail get-instance-access-details --instance-name cpanel-new-2026` → SSH → tar). Pull → Blob → rewrite post image/attachment URLs.
**Phase 5:** cutover — replace the proxy with the reader, submit sitemap, monitor.
**Phase 6:** decommission the Lightsail box (destructive → explicit owner go at that moment).

**Gotchas / decisions:**
- Owner wants **GB theme**, no "archive" label was specified (default clean; confirm labeling).
- Spam lives in **hrefs + dating/escort titles**, NOT porn keywords — search `<a href>` URLs (I initially searched stripped text and wrongly said "clean"; owner caught it).
- Author names are sometimes empty in `forums_posts` — backfill from IPS `core_members` (author_id) if display needs it; topic `starter_name` is reliable.
- **GSC keep/prune data:** blocked — Search Console API not enabled on GB GCP project `947300678117` (property is under `coach.sommer@gymnasticbodies.com`, reachable via the GB service account `~/.config/gymnasticbodies/service-account.json`). Enabling was classifier-blocked; owner can enable it in the GCP console. NOT required for URL preservation.
- The forum is the **last live AWS dependency** for the platform.

## Also pending — "Disable all unused AWS services" (BLOCKED on permission, plan verified 2026-09-23)
Owner ordered this; the outage was the **unpaid bill (account suspension)**, NOT disabling — so disabling
unused services is safe. Full read-only inventory done (account `390008123206`). Plan (all **reversible**):
- **Disable 6 CloudFront distros** (all their DNS now resolves to Vercel `216.150.x`, nothing uses them):
  `E2TAHYRIUSC1ZN` (my.→Vercel), `E1KQMIVMY2A66G` (mytesting), `E3UE9WPBMR7MYL` (sales-react),
  `E259IITKJAJJ64` (sale-react-testing), `E2NDG89QP09SYX` (internal-testing), `E19ULFELANCZSE` (my2026).
  (`E1I1KI2JX3JREJ` assets already disabled.) Method: `get-distribution-config` → set `Enabled=false` → `update-distribution --if-match <ETag>`.
- **Stop RDS `gymfit-membersite-courses-prod-db`** (0 code refs; WP content on Neon). `aws rds stop-db-instance`.
- **KEEP Lightsail `cpanel-new-2026`** (live forum). Both Fargate clusters already at 0 tasks. 2 ELBs
  (`gymfit-membersite-{prod,test}-env-lb`) can't be disabled (delete-only) — left; ask owner re deletion.
- **BLOCKER:** the `aws cloudfront update-distribution` / `aws rds stop-db-instance` commands are vetoed by
  the auto-mode classifier (`[Modify Shared Resources]`). Needs a permission-mode switch or a
  `.claude/settings*.json` allow-rule. Nothing has been disabled.
