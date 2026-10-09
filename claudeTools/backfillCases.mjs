#!/usr/bin/env node
// One-off cleanup for the communication-flows build (claudePlans/communication-flows.md, "Cleanup /
// backfill"). Every support message must be on a case. DRY RUN by default; --confirm writes.
//
//   1. Case-less messages from INTERNAL senders (@gymnasticbodies.com, @tlchatt.com,
//      @gymnasticbodies-test.com):
//      - a staff REPLY to a member ("Re: …", e.g. luke@ answering a member before the sync skipped
//        staff mail) is part of that member's communication: attached to the case of a member
//        message in the same Gmail thread when there is one, otherwise LEFT ALONE and listed;
//      - anything else (test contact forms, [TEST] messages) is deleted — its support_replies go
//        with it (FK cascade).
//   2. Backfill every other case-less support_emails row: group by Gmail thread, then by sender
//      within 14 days; attach the group to an existing case of that sender created in that window
//      (nearest one), else create a CLOSED case with admin_notes "[backfilled 2026-10-09]".
//      Replies on those messages follow automatically (they hang off the message). No Slack, no
//      agent auto-fire — this script only writes the database.
//   3. List the EMPTY cases (no messages, outbound sends or plays) — never deleted here unless
//      --delete-empty-cases is passed; chargeback / dispute cases are always kept.
//
// Every deleted row is backed up first to claudePlans/deleted-cases-backup-2026-10-09.json, and the
// backfill writes a ledger (claudePlans/backfill-cases-2026-10-09.json) so it can be reversed.
//
//   node claudeTools/backfillCases.mjs                 # dry run: counts + listing
//   node claudeTools/backfillCases.mjs --confirm       # do 1 + 2
//   node claudeTools/backfillCases.mjs --confirm --delete-empty-cases   # also 3
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(APP, 'package.json'));
require('dotenv').config({ path: path.join(APP, '.env.local') });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const CONFIRM = process.argv.includes('--confirm');
const DELETE_EMPTY = process.argv.includes('--delete-empty-cases');
const TAG = '[backfilled 2026-10-09]';
const WINDOW_MS = 14 * 864e5;
const INTERNAL = /@(gymnasticbodies\.com|tlchatt\.com|gymnasticbodies-test\.com)$/i;
const BACKUP = path.join(APP, 'claudePlans/deleted-cases-backup-2026-10-09.json');
const LEDGER = path.join(APP, 'claudePlans/backfill-cases-2026-10-09.json');
const t = (d) => new Date(d).getTime();
const norm = (e) => String(e || '').trim().toLowerCase();

const msgs = await sql`SELECT id, gmail_thread_id, from_email, from_name, subject, received_at, user_id
                       FROM support_emails WHERE case_id IS NULL ORDER BY received_at`;
const replies = await sql`SELECT r.* FROM support_replies r JOIN support_emails e ON e.id = r.email_id WHERE e.case_id IS NULL`;
const lastReplyAt = new Map();
for (const r of replies) lastReplyAt.set(r.email_id, Math.max(lastReplyAt.get(r.email_id) || 0, t(r.sent_at)));

const internalAll = msgs.filter((m) => INTERNAL.test(norm(m.from_email)));
const isStaffReply = (m) => /^re:/i.test(String(m.subject || '').trim());
const internal = internalAll.filter((m) => !isStaffReply(m));          // delete
const staffReplies = internalAll.filter(isStaffReply);                  // keep: attach by thread or leave
const member = msgs.filter((m) => !INTERNAL.test(norm(m.from_email)));

// ── Grouping: thread + sender, then merge a sender's groups that sit within 14 days ──
const byKey = new Map();
for (const m of member) {
  const key = `${norm(m.from_email)}|${m.gmail_thread_id || 'nothread:' + m.id}`;
  (byKey.get(key) || byKey.set(key, []).get(key)).push(m);
}
const bySender = new Map();
for (const g of byKey.values()) {
  const s = norm(g[0].from_email);
  (bySender.get(s) || bySender.set(s, []).get(s)).push({ sender: s, msgs: g, first: t(g[0].received_at), last: t(g.at(-1).received_at) });
}
const groups = [];
for (const list of bySender.values()) {
  list.sort((a, b) => a.first - b.first);
  let cur = null;
  for (const g of list) {
    if (cur && g.first - cur.last <= WINDOW_MS) { cur.msgs.push(...g.msgs); cur.last = Math.max(cur.last, g.last); }
    else { cur = { ...g, msgs: [...g.msgs] }; groups.push(cur); }
  }
}
for (const g of groups) g.msgs.sort((a, b) => t(a.received_at) - t(b.received_at));

// ── Match each group to an existing case of that sender in its window ──
const plan = [];
for (const g of groups) {
  const userIds = [...new Set(g.msgs.map((m) => m.user_id).filter(Boolean))];
  const lo = new Date(g.first - WINDOW_MS), hi = new Date(g.last + WINDOW_MS);
  const cands = await sql`SELECT id, status, created_at, title FROM support_cases
                          WHERE (lower(from_email) = ${g.sender} OR user_id = ANY(${userIds}))
                            AND created_at BETWEEN ${lo} AND ${hi}`;
  const mid = (g.first + g.last) / 2;
  cands.sort((a, b) => Math.abs(t(a.created_at) - mid) - Math.abs(t(b.created_at) - mid));
  const lastAt = Math.max(g.last, ...g.msgs.map((m) => lastReplyAt.get(m.id) || 0));
  plan.push({ sender: g.sender, userId: userIds[0] || null, name: g.msgs.find((m) => m.from_name)?.from_name || null,
    emailIds: g.msgs.map((m) => m.id), first: new Date(g.first).toISOString(), last: new Date(lastAt).toISOString(),
    title: g.msgs[0].subject, attachTo: cands[0]?.id || null, attachToStatus: cands[0]?.status || null });
}
const attach = plan.filter((p) => p.attachTo);
const create = plan.filter((p) => !p.attachTo);

// Staff replies: the case of a member message in the same thread (existing case, or this run's plan).
const staffPlan = [];
for (const m of staffReplies) {
  let caseId = null, via = null;
  if (m.gmail_thread_id) {
    const [e] = await sql`SELECT case_id FROM support_emails WHERE gmail_thread_id = ${m.gmail_thread_id} AND case_id IS NOT NULL ORDER BY received_at DESC LIMIT 1`;
    if (e) { caseId = e.case_id; via = 'thread'; }
    else {
      const p = plan.find((x) => member.some((mm) => x.emailIds.includes(mm.id) && mm.gmail_thread_id === m.gmail_thread_id));
      if (p) { via = 'thread-plan'; m._plan = p; }
    }
  }
  staffPlan.push({ m, caseId, via });
}

// ── Empty cases ──
const empty = await sql`
  SELECT c.* FROM support_cases c
  WHERE NOT EXISTS (SELECT 1 FROM support_emails e WHERE e.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM outbound_emails o WHERE o.case_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM support_fires f WHERE f.case_id = c.id)
  ORDER BY c.id`;
const isDispute = (c) => /chargeback|dispute/i.test(`${c.title} ${c.admin_notes || ''}`);
// After the backfill, a case that receives messages is no longer empty.
const attachedIds = new Set(attach.map((p) => p.attachTo));
const emptyAfter = empty.filter((c) => !attachedIds.has(c.id));
const emptyDeletable = emptyAfter.filter((c) => !isDispute(c));

console.log(`\n== ${CONFIRM ? 'CONFIRM' : 'DRY RUN'} ==`);
console.log(`case-less messages:            ${msgs.length}  (replies on them: ${replies.length})`);
console.log(`  internal/test (delete):      ${internal.length}`);
for (const m of internal) console.log(`    #${m.id} ${m.received_at.toISOString().slice(0, 10)} ${m.from_email} — ${m.subject.slice(0, 60)}`);
console.log(`  staff replies (kept):        ${staffPlan.length} — attach by thread: ${staffPlan.filter((x) => x.via).length}, left alone: ${staffPlan.filter((x) => !x.via).length}`);
for (const x of staffPlan) console.log(`    #${x.m.id} ${x.m.received_at.toISOString().slice(0, 10)} ${x.m.from_email} — ${x.m.subject.slice(0, 50)} → ${x.via ? (x.caseId ? 'case #' + x.caseId : 'the thread\'s backfilled case') : 'left alone (no member message in its thread)'}`);
console.log(`  member messages (backfill):  ${member.length} in ${plan.length} groups`);
console.log(`    attach to an existing case: ${attach.length} groups / ${attach.reduce((n, p) => n + p.emailIds.length, 0)} messages (cases: ${[...attachedIds].join(', ') || '—'})`);
console.log(`    new CLOSED backfilled cases: ${create.length} groups / ${create.reduce((n, p) => n + p.emailIds.length, 0)} messages`);
console.log(`empty cases now: ${empty.length}; still empty after backfill: ${emptyAfter.length}; chargeback/dispute kept: ${emptyAfter.length - emptyDeletable.length}; deletable: ${emptyDeletable.length}`);
for (const c of emptyAfter) console.log(`    #${c.id} ${c.status.padEnd(9)} ${c.created_at.toISOString().slice(0, 10)} ${isDispute(c) ? '[KEEP dispute] ' : ''}${c.title.slice(0, 70)}`);

if (!CONFIRM) { console.log('\n(dry run — nothing written; pass --confirm)'); process.exit(0); }

// Bounds the owner approved — refuse outside them.
if (create.length > 300) throw new Error(`refusing: ${create.length} new cases is over the approved ~300`);
if (internal.some((m) => !INTERNAL.test(norm(m.from_email)))) throw new Error('refusing: non-internal message in delete set');

// 1. Back up, then delete the internal/test messages.
const toDeleteEmails = internal.map((m) => m.id);
const emptyToDelete = DELETE_EMPTY ? emptyDeletable : [];
const backup = {
  createdAt: new Date().toISOString(),
  note: 'Rows deleted by claudeTools/backfillCases.mjs (communication-flows cleanup). Restore by re-inserting.',
  support_emails: toDeleteEmails.length ? await sql`SELECT * FROM support_emails WHERE id = ANY(${toDeleteEmails})` : [],
  support_replies: toDeleteEmails.length ? await sql`SELECT * FROM support_replies WHERE email_id = ANY(${toDeleteEmails})` : [],
  support_cases: emptyToDelete,
};
fs.writeFileSync(BACKUP, JSON.stringify(backup, null, 2) + '\n');
console.log(`\nbackup written: ${path.relative(APP, BACKUP)} (${backup.support_emails.length} messages, ${backup.support_replies.length} replies, ${backup.support_cases.length} cases)`);
if (toDeleteEmails.length) {
  const d = await sql`DELETE FROM support_emails WHERE id = ANY(${toDeleteEmails}) AND case_id IS NULL RETURNING id`;
  console.log(`deleted ${d.length} internal/test messages`);
}
if (emptyToDelete.length) {
  const ids = emptyToDelete.map((c) => c.id);
  const d = await sql`DELETE FROM support_cases c WHERE c.id = ANY(${ids})
                        AND NOT EXISTS (SELECT 1 FROM support_emails e WHERE e.case_id = c.id)
                        AND NOT EXISTS (SELECT 1 FROM outbound_emails o WHERE o.case_id = c.id)
                        AND NOT EXISTS (SELECT 1 FROM support_fires f WHERE f.case_id = c.id) RETURNING id`;
  console.log(`deleted ${d.length} empty cases`);
}

// 2. Backfill.
const ledger = { createdAt: new Date().toISOString(), tag: TAG, attached: [], created: [] };
for (const p of attach) {
  await sql`UPDATE support_emails SET case_id = ${p.attachTo} WHERE id = ANY(${p.emailIds}) AND case_id IS NULL`;
  ledger.attached.push({ caseId: p.attachTo, emailIds: p.emailIds, sender: p.sender });
}
for (const p of create) {
  const [c] = await sql`INSERT INTO support_cases (user_id, from_email, from_name, title, status, priority, admin_notes, created_at, resolved_at, updated_at)
                        VALUES (${p.userId}, ${p.sender}, ${p.name}, ${String(p.title || '(no subject)').slice(0, 300)}, 'closed', 'normal', ${TAG}, ${p.first}, ${p.last}, ${p.last})
                        RETURNING id`;
  await sql`UPDATE support_emails SET case_id = ${c.id} WHERE id = ANY(${p.emailIds}) AND case_id IS NULL`;
  ledger.created.push({ caseId: c.id, emailIds: p.emailIds, sender: p.sender });
}
ledger.staffReplies = [];
for (const x of staffPlan.filter((y) => y.via)) {
  const cid = x.caseId || ledger.created.concat(ledger.attached).find((l) => l.emailIds.some((id) => x.m._plan.emailIds.includes(id)))?.caseId;
  if (!cid) continue;
  await sql`UPDATE support_emails SET case_id = ${cid} WHERE id = ${x.m.id} AND case_id IS NULL`;
  ledger.staffReplies.push({ caseId: cid, emailId: x.m.id });
}
fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n');
const [left] = await sql`SELECT count(*)::int n FROM support_emails WHERE case_id IS NULL`;
console.log(`backfill: ${ledger.attached.length} groups attached, ${ledger.created.length} closed cases created; ledger ${path.relative(APP, LEDGER)}`);
console.log(`case-less messages remaining: ${left.n}`);
