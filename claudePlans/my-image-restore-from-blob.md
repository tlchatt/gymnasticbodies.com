# my. Image Restore from Vercel Blob — Feasibility (2026-09-21)

**Question:** during the AWS suspension (S3 `gymfit-images` → `AllAccessDisabled`), can we serve
the my.gymnasticbodies.com app's images from Vercel Blob (the video poster thumbnails) instead,
so the real app can run on Vercel without AWS?

**Answer: NO — not with acceptable coverage.** Keep the maintenance banner up. The clean fix is
restoring the AWS account (billing/suspension), which brings the S3 images back as-is.

## What the app needs (all from `https://gymfit-images.s3.amazonaws.com/…`)

| Bucket path | Kind | Distinct images | Off-AWS source? |
|---|---|---|---|
| `exercises/{CODE}.jpg` | Exercise progression stills (dynamic, CODE from data/API, e.g. `FLPE2`) | **338 codes** | ~none |
| `Welcome/…` | Welcome-page art | 59 refs | none |
| `2020-login/…` | Login/marketing photos | 21 | none |
| `CourseIcons/…` | Course icons | 16 | none |
| `Get/…`, `General/…`, `nutrition/…`, `AdvocatesImages/…` | UI/marketing | ~27 | none |
| `CourseLibraryImages/…` | Course-card art (hardcoded in `CourseCard/index.jsx`) | 4 | none |

## What Blob actually has

- ~8,271 images, but they are **video POSTER thumbnails keyed by JW media id** (`{mediaId}.jpeg`,
  plus `{playlistId}/{mediaId}.jpeg`). Also `blog/`, `marketing/`, `thrive/`, `legacy/` trees —
  those are the **www blog/marketing** images, not the my.-app assets.

## Why posters can't substitute

1. **No mapping exists.** The my. data files carry 338 exercise `image`/`imageName` codes but
   **~0 `mediaId`s**. The live Neon API (`/api/user/workout/byo/program`) returns the exercise
   `image` codes (`FLPE1/2/3…`) but **no `mediaId`** per exercise. So there is no bridge from an
   exercise still to a video poster, in the data or at runtime.
2. **Name overlap is 4.4%.** Of the 338 exercise codes, only **15** exist in Blob by basename.
3. **The ~120 static images** (Welcome/login/CourseIcons/etc.) have **no Blob equivalent at all** —
   they were never migrated off S3.
4. Even where a poster exists, a video poster frame is not the same asset as the exercise **still**
   shown on cards; substituting would be a visible content change, not a faithful restore.

**Net:** deploying the real app pointed at Blob would render broken/incorrect images across the
login, welcome, course-selection, AND exercise-card surfaces — worse than the clean banner.

## The only complete fix

Restore the AWS account (`390008123206`) — the S3 `gymfit-images` bucket, the `my.` CloudFront
distribution, and `api.` all come back together, no re-hosting and no code change. The
`AllAccessDisabled` S3 error is an account-level suspension (billing), so this is an
account-owner/billing action.

## If AWS will be down long (larger project, not a quick stopgap)

The exercise stills would have to be **recovered from another source** (there is no local copy in
any repo/backup — checked), re-hosted (Blob or a new bucket), and the hardcoded
`gymfit-images.s3.amazonaws.com` base URL rewritten across ~15 my. source files + rebuilt (Node 16)
+ redeployed. The static UI/marketing images would need the same. This only becomes worth doing if
the AWS account can't be recovered at all. Until then: **banner stays up.**
