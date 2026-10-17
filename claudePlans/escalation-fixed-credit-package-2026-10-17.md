# "It's fixed" emails + credit + Slack updates — review package (2026-10-17)

Session bfb798bd (worker #4, task 35ee9965). **Nothing has been sent, credited or posted.**
Owner (via manager 22d528f0): "Okay send the it's fixed emails plus credit, show me each group
and credit and email here first." / "Then update the slack items on both channels for each".

Order per member once approved: credit → email (on the case via `sendCaseEmail`, case closed) →
Slack updates.

## Credit — recommendation: 1 month for every member in both groups

Why one month for everyone:
- Every member here waited weeks: G1 from 2 to 5 weeks without being told, G2 from 10 days to 2+ months.
  Per wrote 4–5 times; Woong first reported in August.
- It's the same credit used for earlier tech-fix apologies, and it's simple to explain.
- Nearly everyone pays $15/month, so the cost is about $15 per member (11 members ≈ $165).
  James G and Woong are manual-grant members, so their credit costs nothing.

### How the dry run was done
`claudeTools/credit.js` does **not exist on this machine** (there is no `/var/www/Work/Gymfit/claudeTools`).
I didn't run a substitute tool that writes anything. I ran a read-only script
(`/tmp/esc/cr/dry.mjs`) using the same rule: find every Stripe customer by email, plus the
`stripe_customer_id` stored in Neon.
- **Live sub** (active / trialing / past_due) → push `trial_end` by 1 month from the next bill date.
- **No live sub** → push `renewaldate` by 1 month.

**Applying it needs `credit.js`.** Either the laptop runs it (`--confirm`), or the tool is copied
here. ⚠ **Three members are billed within a week:** Kelly 10-23, Faiz 10-24, Ilan 10-24. Their
credit must land before those dates, or they're charged and the email is wrong.

Flags: nobody is banned, lapsed or missing an account. All 11 are `current`. Every member with a
live sub has exactly one.

## G1 — fixed before today (James G, Tricia, Diana, Faiz)

| Case | Member | Credit path | Before → after |
|---|---|---|---|
| 664 | James Goodell (jamesgoodell@yahoo.com) | no live sub → renewaldate (manual-grant subscriber) | access until 2027-01-08 → **2027-02-08** |
| 668 | Tricia Sambrano (tricia@sambrano.com) | Stripe sub_1U4hpJ… active, $15/mo → trial_end | next bill 2026-11-15 → **2026-12-15** |
| 786 | Diana Alvarez Marin (diana.archi@gmail.com) | Stripe sub_1UNDfA… active, $15/mo → trial_end | next bill 2026-11-05 → **2026-12-05** |
| 712 | Faiz Uzzaman (faiz.uzzaman@gmail.com) | Stripe sub_1UJDRw… active, $15/mo → trial_end | next bill **2026-10-24** → **2026-11-24** ⚠ |

**664 — James Goodell** · Subject: Re: Follow along videos stuck at level 1
> Hi James,
>
> Thanks for your patience on this one. The follow-along videos for the Foundation courses
> now follow the step you're on, so as you progress through an exercise the video moves
> up with you instead of staying on step 1.
>
> If your browser saved the old video, a refresh (or clearing the cache once) will load
> the new one.
>
> To thank you for bearing with us, we've added a free month to your membership. It now
> runs until February 8, 2027.
>
> If anything still looks off, just reply here and we'll take another look.
>
> Best,
> GymnasticBodies Support

**668 — Tricia Sambrano** · Subject: Re: Thrive photos and tasks
> Hi Tricia,
>
> Thank you for reporting this. We've fixed both problems in Thrive: photos you upload now
> stay after you hit Save Changes, and the Thrive tasks show their full text and can be
> opened one by one. The photo you uploaded in September was saved, so you should see it
> there now.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from November 15 to December 15.
>
> If anything still doesn't look right, just reply here.
>
> Best,
> GymnasticBodies Support

**786 — Diana Alvarez Marin** · Subject: Re: Access to Thrive Nutrition is blocked
> Hi Diana,
>
> Thanks for letting us know, and sorry for the wait. Thrive was only opening for members
> who had used it on our old platform, which blocked new and returning members like you.
> That's fixed: your membership now includes Thrive, so you can open it from the app.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from November 5 to December 5.
>
> If you still see a message saying you're not enrolled, sign out and back in once. If it
> persists, reply here and we'll sort it out.
>
> Best,
> GymnasticBodies Support

**712 — Faiz Uzzaman** · Subject: Re: Resetting my exercise steps
> Hi Faiz,
>
> Welcome back! As you asked, we've reset your exercises so every progression starts again
> at level 1, step 1. Your past workout history is still there if you want to look back
> at it.
>
> Sorry we didn't confirm this sooner. We've added a free month to your membership, so
> your next payment moves from October 24 to November 24.
>
> Enjoy the fresh start, and reply here if anything doesn't look right.
>
> Best,
> GymnasticBodies Support

## G2 — fixed today (2026-10-17)

| Case | Member | Credit path | Before → after |
|---|---|---|---|
| 799 | Ilan Levy (ilan.levy@outlook.com) | Stripe sub_1UJ26B… active, $15/mo → trial_end | next bill **2026-10-24** → **2026-11-24** ⚠ |
| 744/752 | James Lord (james@nimblefoot.com.au) | Stripe sub_1ULGfc… trialing (Oct 9 credit), $15/mo → trial_end | next bill 2026-11-06 → **2026-12-06** |
| 757 | Woong Chang (wschang950@hotmail.com) | no live sub → renewaldate (manual-grant subscriber) | access until 2027-04-28 → **2027-05-28** |
| 774/785 | Cornel van Lingen (cornel@pdtsa.co) | Stripe sub_1UJUCT… trialing (Sep 30 credit), $15/mo → trial_end | next bill 2026-11-25 → **2026-12-25** |
| 755 | Kelly Wright (kellyjoelwright@gmail.com) | Stripe sub_1UIrVV… active, $15/mo → trial_end | next bill **2026-10-23** → **2026-11-23** ⚠ |
| 808 | Cody Clark (clarcdy@aol.com) | Stripe sub_1UK0By… active, $15/mo → trial_end | next bill 2026-10-26 → **2026-11-26** |
| 728/792 | Per Nyberg (elawin74@gmail.com) | Stripe sub_1UJvbi… trialing (Oct 9 credit), $15/mo → trial_end | next bill 2026-11-09 → **2026-12-09** |

Confidence notes for the owner:
- **Cornel:** the "progressions / exercises not loading" part is fixed: his cards now show his
  real level-2/3 picks. The **Sunday-scheduling** part ("Sundays is core") is cause E, which isn't
  built yet. His draft says so honestly. Alternatively, hold Cornel until E ships.
- **Ilan:** the Edit problem is fixed. I couldn't confirm his "not on my weekly calendar" point:
  Upper Body is on his Monday and Thursday. The draft invites him to reply if it's still missing.
- **Per:** the edit fix and the missing-sections fix both apply. His stored data looked
  consistent, so I couldn't reproduce his exact screen. The draft invites a reply.

**799 — Ilan Levy** · Subject: Re: Upper Body edit
> Hi Ilan,
>
> Thanks for your patience. You weren't doing anything wrong: when you opened Edit on a
> workout, the window only listed the exercises already in your plan, so it offered Remove
> but never Add. That's fixed. Edit now lists every exercise at every level, and the
> exercises you pick show up on your workout.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from October 24 to November 24.
>
> Upper Body should be on your weekly calendar on Mondays and Thursdays. If you don't see
> it there, reply here and we'll look into it right away.
>
> Best,
> GymnasticBodies Support

**744/752 — James Lord** · Subject: Re: Workouts not showing all exercises
> Hi James,
>
> Thanks for bearing with us. Your Fundamentals workouts were only showing the exercises
> you had changed, so Core showed one exercise/mobility pair, Upper Body showed two of
> three, and the workout stopped partway through. That's fixed: every workout now shows
> its full set of exercises.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from November 6 to December 6.
>
> If anything still looks incomplete, just reply here.
>
> Best,
> GymnasticBodies Support

**757 — Woong Chang** · Subject: Re: Dashboard not showing my current workouts
> Hi Woong,
>
> Thank you for sticking with us, and sorry this took so long. Your dashboard was only
> showing exercises from one level, so the progressions you had moved on to stayed
> hidden behind your first ones, even after you added them. That's fixed: your workouts
> now show the exercise you're currently on in each section (for Core: Kip Extension,
> Windshield Wipers and L-Sit), and changes you make in Edit stick.
>
> To make up for the trouble, we've added a free month to your membership. It now runs
> until May 28, 2027.
>
> If anything still doesn't look right, just reply here.
>
> Best,
> GymnasticBodies Support

**774/785 — Cornel van Lingen** · Subject: Re: Foundation course scheduling
> Hi Cornel,
>
> Thanks for your patience. Your Foundation workouts weren't loading all of your
> progressions: exercises you had progressed to in a higher level were hidden. That's
> fixed, and each workout now shows the exercise you're currently on for every section.
>
> We're still working on letting members schedule a Foundation course on Sunday, and
> we'll let you know when that's ready.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from November 25 to December 25.
>
> Best,
> GymnasticBodies Support

**755 — Kelly Wright** · Subject: Re: Build Your Own Workout edits
> Hi Kelly,
>
> Thank you for reporting this. When you swapped a movement for an earlier version, the
> change saved, but your workout kept showing the old one. That's fixed: the version you
> pick in Edit is now the one that shows, and Remove takes a movement off for good.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from October 23 to November 23.
>
> If anything still doesn't update, just reply here.
>
> Best,
> GymnasticBodies Support

**808 — Cody Clark** · Subject: Re: Build your own workout
> Hi Cody,
>
> Thanks for letting us know. Build Your Own was leaving out every part of a course you
> hadn't picked yourself, which is why the Movement warm-up and the Handstand wrist
> stretches were missing. That's fixed: your Handstand workout now starts with the wrist
> stretches, and Movement starts with the warm-up and includes all its exercises. You
> don't need to reset anything.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from October 26 to November 26.
>
> Best,
> GymnasticBodies Support

**728/792 — Per Nyberg** · Subject: Re: Problem with my member site
> Hi Per,
>
> Thank you for your patience, and sorry it took several messages to get here. We found
> and fixed two problems behind what you saw: workouts were leaving out exercises, and the
> Edit window wasn't saving changes. Each workout now shows all of its exercises, and
> edits stick.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from November 9 to December 9.
>
> If anything still looks wrong, reply here with a screenshot and we'll look at your
> account straight away.
>
> Best,
> GymnasticBodies Support

## Slack updates — after each member's email and credit have gone out

All the Slack items were posted by the same bot the CLI uses (GB Support Agent, `B0BS9JE1A1Y`),
so every one can be **edited** in place. Edits don't notify anyone again.

**Two places per case:**
1. **#gymnastic-bodies-appdevelopment (C0B66FT8MPX), the engineering escalation post → EDIT.**
   `:warning: *Engineering escalation*` becomes `:white_check_mark: *Fixed — <date>* (was: engineering
   escalation)`, and one line is added at the end:
   `_Fixed <date> (<what>, <commit>). Member emailed + credited 1 month (<path>: <before> → <after>)._`
2. **#gymnstic-bodies-support (C0B745W8BHN), the case thread → EDIT the thread's header message**
   (the one-line `:email: *member* · _class_ · ✅ Sent` header) by adding
   `· :white_check_mark: Fixed + emailed + credited <date>`, **plus one thread reply** with the same
   detail line, so it shows in the thread.
   The 7-block play card itself is not edited: the app redraws it.

| Case | Dev-channel post ts (edit) | Support thread ts (header edit + reply) |
|---|---|---|
| 664 | 1790136201.380279 | 1790087288.099529 |
| 668 | 1789440861.343719 | 1789439775.182479 |
| 786 | 1791234981.377139 | 1791216373.334739 |
| 712 | 1790306541.357819 | 1790294782.705229 |
| 799 | 1791352641.475879 | 1791336487.569729 |
| 744/752 | 1790808261.276079, 1790814681.294589 | 1790753475.710149 (744), 1790812032.507379 (752), 1791003101.701039 (752) |
| 757 | 1790895441.958559 | 1790877389.339249 |
| 774/785 | 1791164421.325469 | 1791110281.589899 (774), 1791214318.210589 (785) |
| 755 | 1790909421.603529 | 1790867841.849829 |
| 808 | 1791435562.048519 | 1791410013.948389 |
| 728/792 | 1790585001.249739, 1791234862.181979 | 1790584122.250589 (728), 1791231907.834999 (792) |

**What each fix line says:**
- 664: follow-along video follows the member's step (772c6e5, live 09-30)
- 668: Thrive photos save + tasks readable (my. ac5e6a7/d2a9501, live 09-30)
- 786: Thrive open to every current member (ad9fc3a, live 10-08)
- 712: progress reset done 09-30
- 799: guided Edit lists every progression (my. 1d8551e) + cross-level picks (45a52e3)
- 744/752 and 808: unpicked sections/warm-ups shown (4009d3d)
- 757, 774/785 and 755: one pick per section across levels (45a52e3)
- 728/792: 4009d3d + 1d8551e

**⚠ Clean-up before emailing James Lord:** support fire **#206** (case 752, thread
1791003101.701039) is still `posted`. It's an unsent draft whose **Accept button is still live**.
If someone presses it after our email, James gets a stale second reply. Recommend cancelling it
before the email goes out.

The Thoracic Bridge posts and the posts for Carlos, Uros, Iris and Vigilio are left untouched.

## G3 — partly fixed: email what's in, credit, keep the escalation OPEN (added 2026-10-17)

Owner (via manager): "For the left out for other issues send them an email about what fixes are in
and credit. Just don't close the escalation."

**After sending:** cases and escalations stay **open** (status `escalated`). No case gets closed.

**Credit: 1 month each**, the same amount as G1/G2. They've waited longest, and part of their
problem is still open. If more is owed when the rest is fixed, that can be decided then. Dry run
(read-only): nobody is banned, lapsed or missing an account. Each has one live sub or none.

| Case | Member | Credit path | Before → after |
|---|---|---|---|
| 680 | Carlos Herrera (carlos.herrera1131@gmail.com) | Stripe sub_1U2FnQ… trialing (earlier credits), **$179.88/yr** → trial_end | next bill 2027-08-15 → **2027-09-15** |
| 710 | Uroš Trujkic (uros.trujkic@gmail.com) | Stripe sub_1UIkOy… active, $15/mo → trial_end | next bill **2026-10-23** → **2026-11-23** ⚠ bills in 6 days |
| 700/779 | Iris Barak (ibarak545@gmail.com) | no live sub → renewaldate (manual-grant subscriber) | access until 2027-08-21 → **2027-09-21** |
| 685 | Vigilio Gheser (vigiflyer@hotmail.com) | no live sub → renewaldate (manual-grant subscriber) | access until 2026-12-20 → **2027-01-20** |

**What is and isn't fixed (checked against the live code and data):**

| Case | Fixed now | Still open (why) |
|---|---|---|
| 680 | Swaps and Remove now stick (C 4009d3d, A 45a52e3, D my. 1d8551e) | Mon–Wed empty since the August schedule wipe. The repair isn't authorized yet, so no date is promised. His September Hawaiian Squat swap never saved, so he picks it once more |
| 710 | Exercise changes now show on the workout (A, D). The follow-along video follows the member's step (772c6e5, 09-30) | Sunday (cause E, owner decision). If a video still doesn't match his reps, we need to know which one |
| 700/779 | Edit lists everything and changes stick (C, D). "Play Workout" plays the day in sequence (my. 7c90f4f, 09-30) | Sunday (cause E). **Thoracic Bridge is NOT mentioned:** it belongs to worker #5 / the manager (separate email) |
| 685 | His Core card shows his own Level 2 Front Lever, Side Lever and Manna picks (A) | Core follow-along videos exist for **Level 1 only**. Level 2+ plays each exercise's own demo. That's a content question for Coach, with no promise |

**680 — Carlos Herrera** · Subject: Re: Guided plan edits
> Hi Carlos,
>
> Thank you for sticking with us. Here's where things stand with your guided plan.
>
> Fixed now: changes you make in Edit stick. When you swap an exercise, the new one is
> the one that shows, and Remove no longer brings the old exercise back. Your swap to
> Hawaiian Squats from September didn't save at the time, so please make that change once
> more. It will stay this time.
>
> Still being worked on: your Monday to Wednesday workouts were emptied by a problem with
> our schedule data in August. We're restoring them from your plan and will email you as
> soon as that's done.
>
> To thank you for your patience, we've added a free month to your membership. Your next
> payment moves from August 15, 2027 to September 15, 2027.
>
> Best,
> GymnasticBodies Support

**710 — Uroš Trujkic** · Subject: Re: Buggy interface
> Hi Uroš,
>
> Thanks for your patience, and you were right that the site overhaul caused this. Here's
> where things stand.
>
> Fixed now: when you change an exercise (for example, incline pushup to regular pushup),
> the change now shows on your workout after you close the window. We've also updated the
> follow-along videos so they follow the step you're on. If a video still doesn't match
> the reps you're asked to do, reply with the exercise name and we'll check it.
>
> Still being worked on: adding a workout on Sunday. Plans currently run Monday to
> Saturday, and we're deciding how Sunday should work. We'll let you know when it changes.
>
> To make up for the trouble, we've added a free month to your membership. Your next
> payment moves from October 23 to November 23.
>
> Best,
> GymnasticBodies Support

**700/779 — Iris Barak** · Subject: Re: Guided plan issues
> Hi Iris,
>
> Thank you for your patience, and sorry this has taken so long. Here's where things stand
> with your guided plan.
>
> Fixed now: the Edit button works. It lists every exercise at every level, the changes
> you make stick, and Remove no longer brings back an old exercise. "Play Workout" now
> plays the day's activities one after another.
>
> Still being worked on: generating a workout on Sunday. Plans currently run Monday to
> Saturday, and we're deciding how Sunday should work. We'll let you know when it changes.
>
> To thank you for bearing with us, we've added a free month to your membership. It now
> runs until September 21, 2027.
>
> Best,
> GymnasticBodies Support

**685 — Vigilio Gheser** · Subject: Re: Account issue
> Hi Vigilio,
>
> Thank you for the clear description. It helped. Here's where things stand.
>
> Fixed now: your Core workout shows your own Intermediate 2 progressions for Front Lever,
> Side Lever and Manna. Before, some of your progressions were hidden behind others.
>
> Still open: the "follow along" video. Follow-along videos currently exist for Level 1
> only. At Intermediate 2 and above, each exercise plays its own demonstration video
> instead. We're reviewing this and will let you know if it changes.
>
> To make up for the trouble, we've added a free month to your membership. It now runs
> until January 20, 2027.
>
> Best,
> GymnasticBodies Support

### G3 Slack updates (after each member's credit + email), wording "partly fixed", NOT resolved

Same bot (B0BS9JE1A1Y), so every item is an edit.
- **Dev post → EDIT:** `:warning: *Engineering escalation*` becomes `:large_yellow_circle: *Partly fixed — 2026-10-<dd>* (still escalated)`, plus the line:
  `_Partly fixed <date>: <what> (<commits>). Member emailed + credited 1 month (<path>: <before> → <after>). Still open for: <X>._`
- **Support thread → EDIT header + one thread reply:** the header gets
  `· :large_yellow_circle: Partly fixed — emailed + credited <date>, still open for <X>`.

| Case | Dev post ts (edit) | Support thread ts (header edit + reply) | "Still open for" |
|---|---|---|---|
| 680 | 1789777641.616169 | 1789755998.798869 | Mon–Wed schedule repair (needs go-ahead) |
| 710 | 1790284522.181249 | 1790276937.084919, 1790665289.854069 | Sunday workouts (owner decision) |
| 700/779 | 1790211381.457929 (700), 1791164482.866429 (779) | 1790174187.175989 (700), 1791151796.134419 (779) | Sunday workouts (owner decision); Thoracic handled separately (#5) |
| 685 | 1790127261.936909 | 1790087555.240369 | Level 2+ follow-along videos (content question for Coach) |

**⚠ Clean-up before emailing Uroš:** support fire **#175** (case 710, thread 1790665289.854069) is
still `posted`. It's an unsent draft with a live Accept button. Cancel it first, like #206 for
James Lord.
