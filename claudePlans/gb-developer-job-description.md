# DRAFT — Job description: developer to take over Gymnastic Bodies

Working copy, 2026-10-13. Not published anywhere. Bracketed items are for Greggory / GB to fill in.

---

## Full-Stack JavaScript Developer — Gymnastic Bodies (membership web app)

**Employment type / hours:** [employment type / hours]
**Rate / budget:** [rate / budget]
**Location / time zone:** [location / time zone]
**Start date:** [start date]

### About the role

Gymnastic Bodies runs a paid membership platform for its strength and mobility training programs. Members subscribe, then follow their workouts, videos and progress in a web app. We're looking for a developer to take over the platform from the current development team. You'll own the code, the hosting and the day-to-day running of the app: keeping it up, fixing what breaks, helping with member billing and account issues, and building improvements.

### The platform today

- **app.gymnasticbodies.com:** the main application and API.
  - Built with Next.js (App Router, React 19), PostgreSQL on Neon via Drizzle ORM, better-auth sessions, and Stripe subscriptions and webhooks.
  - Email goes out through SendGrid; the support inbox runs through the Gmail API.
  - Hosted on Vercel, with Vercel Blob for media and Vercel cron jobs.
  - It also serves the marketing site, a read-only public forum archive, and the admin/support tools.
- **my.gymnasticbodies.com:** the member workout dashboard.
  - A React 17 single-page app (Create React App, Redux, Material-UI v4).
  - Built locally and deployed to Vercel as a static bundle.
  - It's expected to merge into app. over time.
- **Support tooling:**
  - an admin support inbox with cases and outbound email;
  - a Slack-based support agent that uses an LLM through the Vercel AI Gateway to investigate member issues and propose fixes for staff approval;
  - Node.js command-line scripts for support and billing operations.

### What you'll do

- Keep both apps running in production: monitor errors, alerts and cron jobs, and fix bugs.
- Own subscriptions and billing in Stripe: renewals, failed payments, cancellations, refunds, credits and chargebacks, and keep Stripe and the database in agreement.
- Handle technical member issues (logins, access, billing questions) with the support team, through the admin tools and the Slack support agent.
- Maintain the database schema and migrations, and the user classification that decides who has access.
- Deploy and manage environments on Vercel (environment variables, domains, Blob storage, crons).
- Maintain and improve the legacy React member dashboard, and plan its move into the Next.js app.
- Build new features and improvements as the business asks.

### Required skills

- Strong JavaScript and React, including production work with Next.js App Router (server components, route handlers).
- PostgreSQL and an ORM (Drizzle or similar), including writing migrations safely against live data.
- Stripe Billing in production: subscriptions, webhooks, invoices, refunds and disputes.
- Deploying and running apps on Vercel (or a similar serverless platform): env vars, crons, logs.
- Authentication and session handling in a web app.
- Comfort working in an older React codebase (React 17, Redux, Create React App, Material-UI v4).
- Git and GitHub.
- Careful, clear written communication. You'll be dealing with paying members' accounts and money, so you'll double-check before acting.

### Nice to have

- Vercel AI SDK / AI Gateway, or building LLM-assisted tools and agents.
- Slack API, SendGrid, or the Gmail / Google Workspace APIs.
- Video delivery for the web (ffmpeg, MP4/WebM, CDN or Blob storage).
- Migrating a Create React App project into Next.js.
- SEO basics: sitemaps, canonical URLs, Search Console.
- Experience with membership or subscription products, or fitness apps.

### Transition and handoff

The current team (Technologic Digital Services) will run a supported handoff:

- **Accounts:** help set up GB-owned accounts on Neon, Vercel and GitHub, and move the database, hosting, Blob storage, both code repositories and the AI Gateway keys onto them.
- **Shadowing:** walk you through the codebase, the operational runbooks and the open issues.
- **Support during the switch:** keep the app running and supported while you take over.

[handoff length / overlap period]

### How to apply

[how to apply]
