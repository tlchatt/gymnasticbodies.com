# Chris account-setup email — working copy (2026-10-13)

Not sent and not yet a Gmail draft. It becomes a draft only after Greggory approves it through the manager.

- **Thread:** "Gymnastic Bodies: transition of ownership and payment timeline" (thread `1a13207561fdd21c`), as a reply to Greggory's 10/13 12:12 "Payment received" message. No thread named "Access / Account Ownership Transition" exists in greggorywiley@tlchatt.com, admin@ or support@gymnasticbodies.com.
- **To:** Chris Sommer <c.sommer@gymfit.tv> (the address he replies from; owner ruling 2026-10-13)
- **Subject:** Re: Gymnastic Bodies: transition of ownership and payment timeline

Facts checked against the live docs and accounts on 2026-10-13:
- GB's GitHub repos are `tlchatt/gymnasticbodies.com` and `tlchatt/my.gymnasticbodies.com`, on the personal GitHub account `tlchatt`.
- Vercel (user `technologic`) and Neon both log in as admin@tlchatt.com.
- GB's Neon project `rapid-pine-41534618` sits in org `admin@tlchatt.com`, which is on the **Launch** plan.
- So the invites must go to admin@tlchatt.com / `tlchatt`, not greggorywiley@tlchatt.com. A transfer needs the same login that owns the source:
  - Vercel: owner of the source team, plus member of the destination.
  - Neon: Admin of the source org, plus a role that can create projects in the destination.
  - GitHub: admin on the repo, plus permission to create repos in the destination org.

---

Hi Chris,

As promised, here are written instructions for setting up the Gymnastic Bodies–owned accounts so we can move the app over to them.

WHY

Everything the app runs on should belong to Gymnastic Bodies, not to me or to any single developer. That means the code (GitHub), the hosting and image/video storage (Vercel), and the database (Neon). Ideally all three accounts sit on one brand-owned email that you control, for example an @gymnasticbodies.com address. You can then give any future developer access through the account itself, and remove it, without ever handing out passwords.

Each service needs the same three things:
1. An organization-type account (not a personal one)
2. The base paid plan, with a card entered
3. An invite to me, so I can move everything in. My login on all three services is admin@tlchatt.com; on GitHub the username is "tlchatt".

1) GITHUB: the code (the app. and my. repositories)

Keep your existing GitHub login and use it to create an organization. GitHub recommends a new organization over converting a personal account.
- Sign in at https://github.com, click your profile picture > Settings > Organizations > New organization, and follow the prompts. Use the brand email wherever it asks for one.
- Plan: GitHub Team. If it starts you on Free, go to the organization > Settings > Billing and licensing > Upgrade to Team, and enter the card under "Payment method". Plans: https://github.com/pricing
- Invite me: organization > People > Invite member > type "tlchatt" > role: Owner > Send invitation.

Docs:
https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/creating-a-new-organization-from-scratch
https://docs.github.com/en/billing/how-tos/manage-plan-and-licenses/upgrade-plan
https://docs.github.com/en/organizations/managing-membership-in-your-organization/inviting-users-to-join-your-organization

2) VERCEL: hosting, plus the image and video storage

Keep your existing Vercel login. On Vercel, projects belong to a "team". The free Hobby plan is for personal, non-commercial use only and can't add members, so Gymnastic Bodies needs a Pro team.
- Sign in at https://vercel.com, open the team switcher (top left) > create a new team > name it (e.g. Gymnastic Bodies) > choose Pro. If you already have a team you'd like to use, open it > Settings > Billing > Upgrade.
- Enter the card in the upgrade step (Settings > Billing). Plans: https://vercel.com/pricing
- Invite me: team > Settings > Members > enter admin@tlchatt.com > role: Owner > Invite. Invites expire after 7 days, so let me know when you send it.
- Pro is billed per member seat, so my seat adds to the bill during the handoff. It can be removed once the move is done.

Docs:
https://vercel.com/docs/accounts#creating-a-team
https://vercel.com/docs/plans/hobby#upgrading-to-pro
https://vercel.com/docs/rbac/managing-team-members

3) NEON: the database

- Sign up at https://console.neon.tech/signup with the brand email. Neon creates an organization for you. You can also add one later with "Create organization" in the profile menu, top right.
- Plan: Launch (or higher). The database is on a Launch plan today, and Neon only lets a project move to an organization on the same plan or higher. Enter the card when you choose the plan. Plans: https://neon.com/pricing
- Invite me: organization > People > Invite member > admin@tlchatt.com > role: Admin.

Docs:
https://neon.com/docs/manage/orgs-manage
https://neon.com/docs/manage/orgs-project-transfer

ORDER OF THE MOVE

Please have all three ready (paid plan active, card entered, invite sent) before I start anything. The code, the hosting and the database are wired to each other, and the move has to happen in a set order. Starting before all three are ready could break the live app. Once I've accepted the three invites, I'll do the move and confirm each step with you. Members shouldn't notice: Vercel moves projects with zero downtime, and Neon keeps the same database connection when a project changes hands.

If you'd rather walk through the setup together, grab a time here:
https://calendar.app.google/4Xfkm3YrBy9qLKiPA

Greggory
