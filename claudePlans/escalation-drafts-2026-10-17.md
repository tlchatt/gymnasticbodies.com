# Engineering escalations — member drafts + Sunday decision (2026-10-17)

Session bfb798bd (worker #4, task 35ee9965). **NOTHING SENT.** Each draft needs the owner's
approval of the exact wording before it goes out. Each one goes on its open case through
`sendCaseEmail` (case reply), and the case is closed after sending.

## 1. James Goodell — case #664 (follow-along stuck at level 1) — fixed 2026-09-30 (772c6e5)

Subject: Re: Follow along videos stuck at level 1

> Hi James,
>
> Thanks for your patience on this one. The follow-along videos for the Foundation courses
> now follow the step you're on, so as you progress through an exercise the video moves
> up with you instead of staying on step 1.
>
> If your browser saved the old video, a refresh (or clearing the cache once) will load
> the new one. If anything still looks off, just reply here and we'll take another look.
>
> Best,
> GymnasticBodies Support

## 2. Tricia Sambrano — case #668 (Thrive photos disappear, tasks unreadable) — fixed 2026-09-30 (my. ac5e6a7 + d2a9501)

Subject: Re: Thrive photos and tasks

> Hi Tricia,
>
> Thank you for reporting this. We've fixed both problems in Thrive: photos you upload now
> stay after you hit Save Changes, and the Thrive tasks show their full text and can be
> opened one by one. The photo you uploaded in September was saved, so you should see it
> there now.
>
> Sorry for the trouble, and if anything still doesn't look right, just reply here.
>
> Best,
> GymnasticBodies Support

## 3. Diana Alvarez Marin — case #786 (Thrive blocked after renewing) — fixed 2026-10-08 (ad9fc3a)

Subject: Re: Access to Thrive Nutrition is blocked

> Hi Diana,
>
> Thanks for letting us know, and sorry for the wait. Thrive was only opening for members
> who had used it on our old platform, which blocked new and returning members like you.
> That's fixed: your membership now includes Thrive, so you can open it from the app.
>
> If you still see a message saying you're not enrolled, sign out and back in once. If it
> persists, reply here and we'll sort it out.
>
> Best,
> GymnasticBodies Support

## 4. Faiz Uzzaman — case #712 (restart from step 1) — done 2026-09-30, never told

Subject: Re: Resetting my exercise steps

> Hi Faiz,
>
> Welcome back! As you asked, we've reset your exercises so every progression starts again
> at level 1, step 1. Your past workout history is still there if you want to look back
> at it.
>
> Enjoy the fresh start, and reply here if anything doesn't look right.
>
> Best,
> GymnasticBodies Support

(He has logged workouts since 09-30, so the reset is in use. The owner decides whether a
credit goes with any of these; none of the drafts promises one.)

## 5. Carlos Herrera — case #680 (guided plan edits + empty Mon–Wed) — AFTER group A ships and his week is repaired

His week has had no classes on Monday–Wednesday since the August schedule wipe (stored shape
`[0,0,0,3,4,1,0]`). The repair (restore Mon–Wed from his AWS plan, with a backup first) is
NOT done yet. Send this only after the repair and the A/C fixes are live.

Subject: Re: Guided plan edits

> Hi Carlos,
>
> Thank you for sticking with us on this, and sorry it took so long. Two things were wrong
> with your guided plan, and both are fixed:
>
> - Monday to Wednesday were left empty by a problem with our schedule data in August.
>   We've restored those days from your plan.
> - Swapping an exercise (for example, Step 1 squats for Hawaiian Squats) wasn't saving.
>   Changes you make in Edit now stick, and Remove no longer brings the old exercise back.
>
> Your change to Hawaiian Squats from September didn't save at the time, so you'll need
> to make that swap once more. After that it will stay.
>
> If anything still looks off, just reply here.
>
> Best,
> GymnasticBodies Support

## Sunday (cause E) — decision for the owner

Guided plans have classes for Monday to Saturday only. All four level templates leave
Sunday out, so when a member taps "Generate Workout" on Sunday nothing happens and no error
appears (Uros #710, Iris #779). Options:
- **(a)** Let members put any class on Sunday with the existing "add a class" picker.
- **(b)** Make Sunday a fixed default, for example a stretch or mobility class from their level.
- **(c)** Keep Sunday as a rest day and show "Sunday is a rest day" instead of a button that does
  nothing.

**Recommendation: (a) plus the message from (c).** Sunday stays a rest day by default, so the
programme Coach designed is unchanged. Members who want to train can add a class themselves,
and nobody gets a dead button. This is a my. change plus a small app. change. Size: small.
