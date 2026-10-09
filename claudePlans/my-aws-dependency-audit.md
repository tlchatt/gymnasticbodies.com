# my.gymnasticbodies.com — AWS dependency audit (2026-09-22)

Question: after the off-AWS migration (Vercel hosting + Blob images + Neon data), **what still
touches AWS, and what would break if the AWS account is suspended again?**

## Verdict: the app is AWS-independent except ONE minor Thrive sub-feature (degrades gracefully).

### Data layer — Neon ✅ (verified: every section's endpoint returns 200)
Guided/Levels, Autopilot/Beginner, Build Your Own (+program), Workout History, Thrive (profile/curriculum),
My Courses, Standing state, user lookup, renewal — all live on Neon (`REACT_APP_API_NEW` =
`gymnasticbodies-com.vercel.app`).

### Image + video layer — Vercel Blob ✅
Deployed bundle: **0** `gymfit-images.s3` references, **140** Blob references. 1,192 images mirrored 1:1
from S3 → Blob, verified serving.

### Auth / session — Neon-only ✅
`loginActions.LoginNew` → `NEWAPI/api/authentication`. The request **Interceptor**
(`Components/UtilComponents/Interceptor/index.jsx`) had the AWS 401/403 session-recovery logic
**removed** ("Both paths are gone with AWS") — it now only handles a Neon 401 → logout.

### The "fail-on-purpose → waterfall" pattern ✅ (works with AWS down)
- **Course Library** (`Containers/CourseLibrary/index.jsx`): deliberately `Promise.reject`s and renders
  from the **local embedded** `mainCourses` dataset via its `.catch`. The AWS `API` const is defined but
  never called. AWS-free.

### Dead / inert (no live AWS call)
- `Store/Action/loginActions-original.js` — imported by **0** files (dead).
- `loginActions.js:225` — the only true `API + '/auth'` call, **commented out**.
- `Store/Reducers/Login.js` — `${REACT_APP_API}` appears only in explanatory comments.
- `Store/util.js` `AxiosConfig` — a config-builder helper; active callers use `NEWAPI`.

### ⚠️ The ONE residual live AWS call — degrades gracefully
- **`Components/Thrive/MissedDays.jsx`** — the Thrive "missed days" tracker does a live
  `GET/POST ${REACT_APP_API}/thrive/tasks/missedlog/users/{userId}` against the **AWS** api, with only
  `.catch(err => Sentry.captureException(err))` — **no Neon fallback**.
  - **If AWS is suspended:** this call fails, is logged to Sentry, and `missedDays` stays empty. The
    tracker shows/saves nothing, but **does not crash** — the rest of Thrive (on Neon) is unaffected.
  - **To fully close the gap:** point this GET/POST at a Neon endpoint (or remove the feature). Minor.

## Bottom line
If the AWS account is suspended again, `my.` **keeps working end-to-end** — auth, all workout data,
images, videos, Course Library, Thrive profile. The single exception is the Thrive **missed-days**
tracker, which silently no-ops until AWS returns (or until we migrate that one call to Neon).
