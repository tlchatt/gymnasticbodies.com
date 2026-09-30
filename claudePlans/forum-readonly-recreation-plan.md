# Forum → read-only public archive on Vercel/Neon (2026-09-22)

**Goal:** replace the AWS-hosted Invision forum with a **read-only, public** recreation, hosted off AWS
(Vercel + Neon), **preserving the existing URLs** (primary SEO lever) and **redirecting** everything
pruned. No login, no posting. Then decommission the Lightsail box.

## Corrections (2026-09-30, verified against the live site — these override anything below)
- **Forum-listing URL is `/forum/forum/{id}-{slug}` (singular)**, not `/forum/forums/...`. Taken from the
  links on the live index. Topic URL `/forum/topic/{tid}-{slug}` is as written. Pagination is `/page/N`.
- **Trailing slash:** Invision's canonicals end in `/`, but Next has 308'd the slash form to the no-slash
  form since the 2026-07-22 cutover. The reader's canonical is the **no-slash** URL (the one that serves 200).
- **Most of the forum is NOT public.** Probing all 52 forums logged-out: guests can read only
  17 Nutrition, 19 Equipment, 20 Community, 22 Strength, 24 Movement, 26 Mobility, 27 Getting Started
  (13,347 topics) and topics in 16 Digital Coaching (1,652; its listing 404s). The other ~19,000 topics are
  in members-only course forums, Form Checks, Mod Squad, Brand Development, GB Affiliates and admin-only
  areas (403/404 for guests). The ETL flagged 51 of 52 forums `is_public = true`, which was wrong.
  **Reader rule: serve a topic only if `approved=1 AND NOT spam` AND its forum is guest-visible.** Private
  topics redirect; their uploads are backed up locally but never put in public Blob. Probe table:
  `claudePlans/forum-guest-visibility-2026-09-30.json`.
- **81,136 of 271,209 posts had no author name** after the ETL — backfilled from the dump
  (`claudeTools/forumAuthorBackfill.mjs`).
- **Cutover gate:** reader pages live at their final paths; `FORUM_READER_LIVE` in `next.config.mjs` keeps
  production on the Invision proxy until it is flipped. Dev and preview deploys show the reader.

## Source (frozen)
- Full IPS4 DB dump: `forum_backup_2026-07-24/goatfart_forum40.sql.gz` (510 MB gz / 3.36 GB).
  Forum is frozen (no new posts), so this is current enough for content.
- Key tables: `forums_forums` (124 forums), `forums_topics` (~37k, cols incl. `tid`, `title`,
  `title_seo`, `forum_id`, `views`, `approved`, `pinned`, `state`, `topic_firstpost`, `start_date`,
  `starter_name`), `forums_posts` (~283k), `core_members` (authors), plus attachments meta.
- **Attachments/uploads (5,670 files) live only on the Lightsail box** (reachable via AWS CLI) — pulled in Phase 4.

## URL preservation (the primary thing)
IPS URL patterns to preserve, matched by **numeric id** (slug is cosmetic; canonical to exact slug):
- `/forum/` → index (categories)
- `/forum/forums/{id}-{slug}/` → a forum's topic list
- `/forum/topic/{tid}-{slug}/` (+ `?page=N`) → a topic + its posts
- `/forum/profile/...`, `/forum/search/...` etc. → 301 to index or drop
- Legacy `index.php?/topic/...` → 301 to the clean URL
- **Pruned topics → 301** to their parent forum; pure spam → **410**.
Every kept page: server-rendered HTML, `<title>`/meta/H1 from the topic, `rel=canonical`, and a fresh
`/forum/sitemap.xml`. Nothing 404s — preserve or redirect.

## Cleanup (data-driven, SEO-safe)
Prune only what has no SEO to lose: `approved=0` topics (moderation/spam queue), 0-view/0-reply dead
threads, deleted-post shells, bot-registration noise; **exclude private stuff** (PMs, hidden/mod-only
forums) from a public archive. Keep everything with views/backlinks. (GSC clicks/impressions would
sharpen the line — available once the Search Console API is enabled on GB's GCP project — but URL
preservation doesn't depend on it.)

## Proposed Neon schema (NEEDS YOUR OK before I create it)
Three tables (prefixed `forum_`), in the existing GB Neon DB:
- `forum_categories(id PK, parent_id, title, seo_slug, position, is_public)`
- `forum_topics(tid PK, forum_id, title, seo_slug, starter_name, start_date, views, post_count, approved, pinned, state, first_pid)`
- `forum_posts(pid PK, tid, author_name, post_date, html)`  — post bodies as sanitized HTML
Authors denormalized as names (no user accounts in a read-only archive). Indexes on `forum_topics.forum_id`,
`forum_posts.tid`.

## Reader (replaces the proxy)
Replace `app/forum/[[...path]]/route.js` (currently an AWS reverse-proxy) with a real **Next reader in
app.gymnasticbodies.com** that renders the URL patterns above from Neon, read-only/public. Same host,
same paths → URLs preserved automatically. (Alternative: a separate Vercel project — but reusing app.
keeps the `www/forum` routing we already have.)

## ETL options (the one open technical choice)
The dump is MySQL; Neon is Postgres. To load it:
1. **Start the local MariaDB** (it's installed but stopped) → import dump → ETL script reads MariaDB, writes Neon. Cleanest; needs the service started (may need sudo).
2. **Parse the dump directly** (extract forums/topics/posts INSERTs → Neon). No MySQL needed, but post HTML escaping is fiddly.
3. **Query the live MySQL on the Lightsail box** over SSH (AWS CLI get-instance-access-details) → ETL to Neon. Works but needs box SSH.

## Phases
1. **Schema + ETL** — create Neon tables, load forums/topics/posts (this plan's gate = your schema OK).
2. **Reader** — build the read-only Next reader; verify a sample of preserved URLs render.
3. **URL map + redirects + sitemap** — preserve kept, 301/410 the rest.
4. **Attachments** — pull `/uploads` from Lightsail → Blob; rewrite post image/attachment URLs.
5. **Cutover** — repoint `/forum` to the reader; submit sitemap; monitor GSC.
6. **Decommission** — after soak, delete the Lightsail instance (destructive → explicit go at that moment).
