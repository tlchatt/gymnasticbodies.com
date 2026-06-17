# Session: WPMigrationPlan

- **Session ID:** a303b5df-969b-4617-9077-6f07bca8233e (prior context window) + fd75229f-8c2c-439f-ad85-17967b151e84 (current)
- **Working directory:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date:** 2026-06-17
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/fd75229f-8c2c-439f-ad85-17967b151e84.jsonl`

---

## Summary

Audited all subscribe/CTA links on `www.gymnasticbodies.com` (WordPress), discovered they all point to an old WooCommerce pricing page. Decided to fully migrate the WordPress marketing site into `app.gymnasticbodies.com`. Spent the entire session designing and iterating the migration plan — 13-step implementation, database-first architecture, PortableText JSON for all content, inline styles via `GetSettings()` for all new components. Plan approved; zero code written yet.

---

## First User Inputs

1. "I want you to look over the Wordpress marketing site, https://www.gymnasticbodies.com/ any kind of subscribe or sign up or get started type buttons or links should send users over https://app.gymnasticbodies.com/subscribe can you check every page and make sure its all pointed correctly?"
2. "Okay I think the move is to 'recreate' the wordpress site at app.gymnasticbodies.com. Lets make a plan to migrate the pages,content,and functionality, but featuring the updated style, over to the React Site."
3. "We're not going to keep the articles on wordpress we are getting those over here also."
4. "All page json will be stored in the database in a pages table."
5. "All content should be stored as portable text json."

---

## Key Accomplishments

- Audited all 7 WordPress marketing pages via WebFetch — found broken CTAs on every page
- Designed full migration plan covering: 7 marketing pages + blog (280+ posts), database schema, PortableText content spec, component architecture, blog migration script, seeding script, component guide
- Discovered and incorporated `lib/GetSettings.js` already exists in GymFit project — confirmed inline styles pattern via `data/Settings.jsx` + `data/Appearance.jsx`
- Plan approved and saved to `~/.claude/plans/delegated-mapping-hummingbird.md`

---

## Technical Overview

### Plan file
`~/.claude/plans/delegated-mapping-hummingbird.md` — full approved implementation plan.

### Architecture decisions
- **All content in Neon DB** — `pages` table (marketing + blog unified by `type` field) + `site_settings` table (nav, footer, testimonials). No JSON content files.
- **PortableText JSON everywhere** — every content field in every component is a PortableText document. Not "rich text" — a structured content spec. Packages: `@portabletext/block-tools` (migration), `@portabletext/react` (rendering).
- **Shared renderer** — `lib/portableText.js` (to be created): single pre-configured `<PortableText>` with all custom serializers. Never import `@portabletext/react` directly in components.
- **Custom block types** — `navLink`, `ctaButton`, `socialLink`, `videoEmbed`, `image`, `componentSection`, `propsTable`, `codeBlock`, `componentPreview`.
- **Inline styles only for all new components** — `GetSettings()` from `lib/GetSettings.js` (already exists) for responsive values; `var(--*)` CSS tokens from `globals.css` for colors. Zero `.module.css` for new components. Existing components (`PricingCard`, `FeaturesList`, `BottomCta`, `DarkNav`) keep their CSS modules — only their props are updated to accept PortableText.
- **Blog migration** — WP REST API → `pages` table (`type = 'blog_post'`, slug `blog/<wp-slug>`). Self-hosted video → Vercel Blob. YouTube/Vimeo stay as `videoEmbed` blocks.
- **NavShell removed** — each page server component fetches and passes `nav`/`footer` site_settings props directly to `DarkNav` + `MarketingFooter`.

### New Drizzle tables (not yet created)
- `pages` — `id, slug (unique), type, title, meta (jsonb), content (jsonb), category, tags, author, featuredImage, publishedAt, status, updatedAt`
- `site_settings` — `id, key (unique), value (jsonb), updatedAt`

### Existing relevant files
- `lib/GetSettings.js` — already exists, full implementation; used by all new components
- `data/Settings.jsx` — responsive spacing/width scale consumed by GetSettings
- `data/Appearance.jsx` — SRC Inc colors (blue) — do NOT use `Colors(scheme)` for GymFit dark/orange; use `var(--*)` directly
- `app/globals.css` — GymFit CSS custom properties (`--bg-base`, `--bg-surface`, `--accent`, `--text`, `--gradient-cta`, etc.)
- `Drizzle/db/schema.ts` — current schema (last read line 300); add `pages` + `site_settings` here
- `app/subscribe/page.js` — current subscribe page pattern (reads from JSON, will switch to DB)
- `data/content/subscribe.json` — current subscribe content (will be seeded to DB then deleted)

---

## Implementation Order (next session picks up at Step 1)

1. **Drizzle schema** — add `pages` + `site_settings` to `Drizzle/db/schema.ts`; run `npx drizzle-kit generate && npx drizzle-kit migrate`
2. **`lib/portableText.js`** — shared renderer with all custom serializers
3. **`lib/siteSettings.js`** — `getSiteSettings(...keys)` helper
4. **`claudeTools/seedPages.js`** — seed `pages` + `site_settings` tables; port `data/content/subscribe.json` to PortableText; delete JSON files after
5. **`claudeTools/migrateBlog.js`** — WP REST API → `pages` table blog posts
6. **New marketing components** — `MarketingFooter`, `ProgramGrid`, `ContentHero`, `ContentSection`, `TestimonialsCarousel`, `FaqAccordion`, `FitnessQuiz`, `BlogCard`, `BlogGrid` (all inline styles)
7. **Update existing** — `subscribe/page.js` (DB fetch), `FeaturesList`, `BottomCta`, `PricingCard`, `DarkNav` (PortableText props), `layout.js` (remove NavShell)
8. **Content pages** — hey-newbies, think-stronger, mobility, body-weight
9. **All-access page**
10. **Free-members page**
11. **Blog pages** — `/blog` + `/blog/[slug]`
12. **Homepage** — replace redirect with full marketing homepage
13. **Component guide** — `/admin/component-guide`

---

## Git / Vercel

No code was written. No commits. No deploys.

---

## Note for Next Session

**Goal:** Begin implementation — Step 1 is adding `pages` and `site_settings` tables to the Drizzle schema, then building `lib/portableText.js` and `lib/siteSettings.js`.

**First action:** Open `Drizzle/db/schema.ts` and append the two new tables, then run:
```bash
cd app.gymnasticbodies.com && npx drizzle-kit generate && npx drizzle-kit migrate
```

**Quirks to know:**
- `data/Appearance.jsx` has SRC Inc colors — do NOT use `Colors(scheme)` for GymFit. Use `var(--*)` from `globals.css` directly in inline style objects.
- The schema file uses TypeScript (`.ts`) — keep it that way even though the rest of the project is JS.
- No test keys in `.env.local` — live Stripe key is intentionally left in place.

**Plan file:** `~/.claude/plans/delegated-mapping-hummingbird.md`
