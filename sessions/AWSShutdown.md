# Session: AWSShutdown

- **Session ID:** `41dadbf1-ad9a-4e49-884d-056e98d46760` (worker, dispatched by manager `987aa382`)
- **Working dir:** `/var/www/Work/Gymfit/app.gymnasticbodies.com`
- **Date:** 2026-10-09
- **Transcript:** `~/.claude/projects/-var-www-Work-Gymfit-app-gymnasticbodies-com/41dadbf1-ad9a-4e49-884d-056e98d46760.jsonl`
- **Task:** owner ordered the remaining AWS services (account `390008123206`, us-east-1) turned off.
  Owner rule set this session: **a local copy AND a Blob copy of everything must exist before anything is deleted.**
- **Local backup dir:** `/mnt/data/work-backup/gymfit-aws-final-2026-10-09/` (data disk, 1.1 TB free)

## Findings as of 2026-10-09 ~10:00 ET (read-only checks)

Oct 1–8 AWS bill $272: Lightsail $107.50, RDS $84.58 (of which $81.74 is MySQL 5.7 Extended Support),
Support $29, S3 $20.90, ELB $8.64, VPC (ALB public IPv4) $2.88, Route 53 $2.50, ECR $0.77.

| Resource | Usage check | Verdict |
|---|---|---|
| Lightsail `cpanel-new-2026` (server5, 34.205.92.109) | Hosts only cPanel acct `goatfart` (gymnasticbodies.com subdomains + gymfit.tv). Apache log = localhost WHM status checks + bots. Only DNS → it: `server5.gymnasticbodies.com`. Code ref: `lib/forumProxy.js` (rollback only; `FORUM_READER_LIVE=true`) | unused |
| Lightsail `cPanel_WHM_for_Linux-1` | stopped since 2026-08-17; snapshot exists | unused |
| RDS `gymfit-membersite-courses-prod-db` (MySQL 5.7, deletion protection on, public, SG `sg-00ef254a10a8e1922` allows only 183.83.213.229/32) | 0 connections in 14 days | unused |
| ALBs `gymfit-membersite-{prod,test}-env-lb` | 0 targets. Prod still gets ~2,800 req/day, all ELB 503s for 30+ days | unused (callers already broken) |
| CloudFront ×6 | only E2TAHYRIUSC1ZN had traffic (~250 req/day via raw CF domain); DNS for all aliases is on Vercel | unused |
| S3 `gb-cpanel-backups` | 3.6 TB Standard: 14 daily cPanel full backups `server3/2026-08-04…08-17` (~235 GB each), no lifecycle | archive only |
| S3 `gymfit-user-images` | **STILL IN USE** — `my.` ImageUpload components build profile-photo URLs on it | keep |
| Fargate clusters ×2 | 0 tasks, 26 services each; ECR 57 repos | ~$0, leave |

**DNS discovery:** `api.gymnasticbodies.com` in the Vercel zone is a CNAME to the prod ALB (imported record,
79 days old). The Route 53 repoint to Vercel from 2026-08-17 stopped mattering when nameservers moved to
Vercel, so `legacy_api.hit` logging has been dark since 2026-08-18. Vercel itself already answers `api.`
correctly (410) — only the record needs replacing.

**Adjacent (reported, not fixed):** `gymfit.tv` + `www.gymfit.tv` A → 35.169.12.160, a released AWS IP
(subdomain-takeover risk). Profile photos are the last `my.` runtime tie to AWS (S3).
Small leftovers in other regions: us-east-2 RDS manual snapshots `backup`, `sh-rds-backup` (100 GB each)
and 3 EBS snapshots from 2017–2018 (~$5/mo total).

## Actions log
- 2026-10-09 ~10:15 — Lightsail snapshot `cpanel-new-2026-final-20261009` created (state available).
- 2026-10-09 ~10:26 — Started local download of S3 `server3/2026-08-17/` (system_files.tar 8 GB + goatfart.tar 226 GB).
- 2026-10-09 10:34 — server5 `mysqldump --all-databases` saved locally: `server5-cpanel-new-2026/all-databases.sql.gz` (740 MB, "Dump completed").
- 2026-10-09 ~10:30 — **Disabled 6 CloudFront distributions** (E2TAHYRIUSC1ZN, E1KQMIVMY2A66G, E3UE9WPBMR7MYL, E259IITKJAJJ64, E2NDG89QP09SYX, E19ULFELANCZSE). Reversible; original configs saved in the session scratchpad.
- 2026-10-09 — Swapping `api.` CNAME → Vercel was **blocked by the auto-mode classifier** (DNS change). ALB deletion held until it is done.
- 2026-10-09 10:35 — server5 file tar (`/home/goatfart /etc /var/cpanel /var/named /usr/local/apache/conf /root`) restarted after the Lightsail SSH cert expired between steps.
- 2026-10-09 ~10:50 — Forum session asked to deactivate old forum S3 key `AKIAJRIRUKHT743MGZZA`: not in this account (AccessDenied on last-used; absent from all 12 IAM users), bucket `gbforumimages` has no policy and owner-only ACL. Nothing to deactivate; no IAM change. Replied to the forum session.
