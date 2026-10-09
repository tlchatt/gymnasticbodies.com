#!/usr/bin/env node
// Tests for the communication-flows build (claudePlans/communication-flows.md):
//   A. inbound case picker  (lib/support/caseFor.js)
//   B. support sends on a case with a case-stamped Message-ID (lib/support/sendSupport.js,
//      lib/support/execute.js reply + escalation notice)
//   C. administrative recording + the once-per-subscription cancellation notice
//      (lib/recordOutbound.js, lib/sendgrid.js, lib/cancellationNotice.js)
// SendGrid is STUBBED before any app module loads — nothing is sent. Only the dedicated test
// accounts are touched (claudeTools/accountTestUsers.json), and every row created is deleted.
//
//   node claudeTools/testSupportCases.mjs
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(APP, 'package.json'));
require('dotenv').config({ path: path.join(APP, '.env.local') });
// Never touch Slack from a test (escalate posts to the dev channel when this is set).
delete process.env.SLACK_DEV_CHANNEL_ID;
delete process.env.SLACK_BOT_TOKEN;

const sent = [];
const sg = require('@sendgrid/mail');
sg.send = async (msg) => {
  if (!/@gymnasticbodies-test\.com$/i.test(String(msg.to))) throw new Error(`TEST GUARD: refused send to ${msg.to}`);
  sent.push(msg);
  return [{ statusCode: 202 }];
};

const { createJiti } = require('jiti');
const jiti = createJiti(path.join(APP, 'package.json'), { alias: { '@': APP } });
const caseFor = await jiti.import(path.join(APP, 'lib/support/caseFor.js'));
const { sendCaseEmail } = await jiti.import(path.join(APP, 'lib/support/sendSupport.js'));
const { executePlay } = await jiti.import(path.join(APP, 'lib/support/execute.js'));
const { notifySubscriptionCancelled, suppressCancellationNotice } = await jiti.import(path.join(APP, 'lib/cancellationNotice.js'));
const { sendResetLinkEmailSG } = await jiti.import(path.join(APP, 'lib/sendgrid.js'));
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const users = require(path.join(APP, '../claudeTools/accountTestUsers.json'));
const A = users.lapsed;      // the member under test
const B = users.purchased;   // a different member (cross-member guard)

let pass = 0, fail = 0;
const ok = (cond, label, extra = '') => { if (cond) { pass++; console.log(`  PASS ${label}${extra ? ' — ' + extra : ''}`); } else { fail++; console.log(`  FAIL ${label}${extra ? ' — ' + extra : ''}`); } };

const createdCases = new Set();
const createdEmails = new Set();
const subIds = [];
const T0 = new Date();

async function mkCase({ email, userId, status, closedDaysAgo = null, title }) {
  const resolved = closedDaysAgo == null ? null : new Date(Date.now() - closedDaysAgo * 864e5);
  const [c] = await sql`INSERT INTO support_cases (user_id, from_email, title, status, priority, resolved_at)
                        VALUES (${userId}, ${email}, ${title}, ${status}, 'normal', ${resolved}) RETURNING id`;
  createdCases.add(c.id);
  return c.id;
}
async function mkEmail({ caseId, email, userId, threadId = null, subject = 'test' }) {
  const [e] = await sql`INSERT INTO support_emails (gmail_message_id, gmail_thread_id, from_email, subject, body, received_at, status, user_id, case_id)
                        VALUES (${'test_' + Math.random().toString(36).slice(2)}, ${threadId}, ${email}, ${subject}, 'body', now(), 'open', ${userId}, ${caseId}) RETURNING id`;
  createdEmails.add(e.id);
  return e.id;
}
// Park every pre-existing OPEN case of the test member so "fresh message" rules are deterministic.
const parked = await sql`SELECT id, status, resolved_at FROM support_cases
                         WHERE (lower(from_email) = ${A.email} OR user_id = ${A.userId}) AND status = ANY(${caseFor.OPEN_CASE_STATUSES})`;
if (parked.length) await sql`UPDATE support_cases SET status = 'closed' WHERE id = ANY(${parked.map((p) => p.id)})`;
const track = (r) => { if (r?.caseId) createdCases.add(r.caseId); return r; };

try {
  console.log('\nA. Inbound case picker');
  const stamp = (id) => caseFor.caseMessageId(id);

  // A1 reply (header) to a case closed 10 days ago -> reopen that case
  const c1 = await mkCase({ email: A.email, userId: A.userId, status: 'resolved', closedDaysAgo: 10, title: 'A1' });
  const r1 = track(await caseFor.caseForInbound({ email: A.email.toUpperCase(), userId: null, subject: 'Re: A1', inReplyTo: stamp(c1) }));
  const [c1row] = await sql`SELECT status, resolved_at FROM support_cases WHERE id = ${c1}`;
  ok(r1.caseId === c1 && r1.action === 'reopened' && c1row.status === 'open', 'reply <60d reopens the same case (upper-case sender)', JSON.stringify(r1));

  // A2 reply to a case closed 70 days ago -> new case linked back
  await sql`UPDATE support_cases SET status = 'closed', resolved_at = now() - interval '70 days' WHERE id = ${c1}`;
  const r2 = track(await caseFor.caseForInbound({ email: A.email, userId: A.userId, subject: 'Re: A1 again', references: `<abc@mail.example> ${stamp(c1)}` }));
  const [n2] = await sql`SELECT admin_notes, status FROM support_cases WHERE id = ${r2.caseId}`;
  ok(r2.caseId !== c1 && r2.action === 'created' && r2.linkedFrom === c1 && n2.admin_notes?.includes(`Continues case #${c1}`), 'reply >=60d opens a new case linked back', `${JSON.stringify(r2)} notes="${n2.admin_notes}"`);

  // A3 fresh message while a case is open -> added to the open case (r2's new case is open)
  const r3 = track(await caseFor.caseForInbound({ email: A.email, userId: A.userId, subject: 'another question' }));
  ok(r3.caseId === r2.caseId && r3.action === 'attached' && r3.via === 'open_case', 'fresh message goes on the open case', JSON.stringify(r3));

  // A4 fresh message with no open case -> new case linked to the last case
  await sql`UPDATE support_cases SET status = 'closed', resolved_at = now() WHERE id = ${r2.caseId}`;
  const r4 = track(await caseFor.caseForInbound({ email: A.email, userId: A.userId, subject: 'brand new topic' }));
  const [n4] = await sql`SELECT admin_notes FROM support_cases WHERE id = ${r4.caseId}`;
  ok(r4.action === 'created' && r4.linkedFrom === r2.caseId && n4.admin_notes?.includes(`Continues case #${r2.caseId}`), 'fresh message without open case -> new case linked back', JSON.stringify(r4));

  // A5 thread fallback: no header, same Gmail thread as an earlier message on a recently-closed case
  await sql`UPDATE support_cases SET status = 'closed', resolved_at = now() - interval '3 days' WHERE id = ${r4.caseId}`;
  const thread = 'testthread_' + Date.now();
  await mkEmail({ caseId: r4.caseId, email: A.email, userId: A.userId, threadId: thread });
  const r5 = track(await caseFor.caseForInbound({ email: A.email, userId: A.userId, subject: 'Re: brand new topic', threadId: thread }));
  ok(r5.caseId === r4.caseId && r5.action === 'reopened' && r5.via === 'thread', 'Gmail-thread fallback reopens the thread\'s case', JSON.stringify(r5));

  // A6 a header naming ANOTHER member's case is ignored
  const cB = await mkCase({ email: B.email, userId: B.userId, status: 'open', title: 'B case' });
  const r6 = track(await caseFor.caseForInbound({ email: A.email, userId: A.userId, subject: 'spoof', inReplyTo: stamp(cB) }));
  ok(r6.caseId !== cB, 'header pointing at another member\'s case is not trusted', JSON.stringify(r6));

  // A7 explicit in-app reply on a case closed 10 days ago -> reopen
  const c7 = await mkCase({ email: A.email, userId: A.userId, status: 'closed', closedDaysAgo: 10, title: 'A7' });
  await sql`UPDATE support_cases SET status = 'closed' WHERE id = ${r6.caseId}`;
  const r7 = track(await caseFor.caseForInbound({ email: A.email, userId: A.userId, subject: 'in-app reply', replyToCaseId: c7 }));
  ok(r7.caseId === c7 && r7.action === 'reopened' && r7.via === 'explicit', 'in-app reply on a case reopens it', JSON.stringify(r7));

  ok(JSON.stringify(caseFor.caseIdsFromHeaders({ inReplyTo: '<case-12.ab12@gymnasticbodies.com>', references: '<case-3.ff@gymnasticbodies.com> <x@y> <case-9.aa@gymnasticbodies.com>' })) === '[12,9,3]',
    'header parsing prefers In-Reply-To, then newest References');

  console.log('\nB. Support sends are on a case, case-stamped, always recorded');
  let threw = null;
  try { await sendCaseEmail({ to: A.email, subject: 's', text: 'x', caseId: null }); } catch (e) { threw = e.message; }
  ok(threw && /no case/.test(threw) && sent.length === 0, 'sendCaseEmail refuses a send with no case (nothing sent)', threw);

  // B1 agent reply on a case with NO inbound message -> outbound_emails(type support, case_id) + Message-ID
  await sql`UPDATE support_cases SET status = 'closed' WHERE id = ${c7}`;
  const cNoMsg = await mkCase({ email: A.email, userId: A.userId, status: 'open', title: 'No inbound message here' });
  const delete_agent = process.env.SUPPORT_AGENT_USER_ID; delete process.env.SUPPORT_AGENT_USER_ID;
  const ex1 = await executePlay({ member_email: A.email, response: 'Hi there,\n\nTest reply.', actions: [], case_id: cNoMsg });
  const m1 = sent.at(-1);
  const [o1] = await sql`SELECT id, case_id, type FROM outbound_emails WHERE case_id = ${cNoMsg} ORDER BY id DESC LIMIT 1`;
  ok(ex1.ok && o1?.type === 'support' && o1?.case_id === cNoMsg, 'agent reply with no inbound message is recorded in outbound_emails on the play\'s case', `step=${JSON.stringify(ex1.steps.at(-1))}`);
  ok(new RegExp(`^<case-${cNoMsg}\\.[0-9a-f]{16}@gymnasticbodies\\.com>$`).test(m1?.headers?.['Message-ID'] || ''), 'Message-ID header carries the case id', m1?.headers?.['Message-ID']);
  ok(m1?.subject === 'Re: No inbound message here' && m1?.replyTo === 'support@gymnasticbodies.com', 'subject from the case title, reply-to support@', m1?.subject);

  // B2 agent reply on a case WITH an inbound message + agent user configured -> support_replies on that message
  const [admin] = await sql`SELECT id FROM "user" WHERE role = 'admin' ORDER BY created_at LIMIT 1`;
  process.env.SUPPORT_AGENT_USER_ID = admin.id;
  const cMsg = cNoMsg;
  const eId = await mkEmail({ caseId: cMsg, email: A.email, userId: A.userId, subject: 'Help with my plan' });
  const ex2 = await executePlay({ member_email: A.email, response: 'Second reply.', actions: [], case_id: cMsg });
  const [rep2] = await sql`SELECT id, gmail_message_id FROM support_replies WHERE email_id = ${eId}`;
  const m2 = sent.at(-1);
  ok(ex2.ok && rep2 && rep2.gmail_message_id === m2.headers['Message-ID'] && m2.subject === 'Re: Help with my plan', 'reply on a case with a message -> support_replies, Message-ID stored', JSON.stringify(ex2.steps.at(-1)));
  if (delete_agent) process.env.SUPPORT_AGENT_USER_ID = delete_agent; else delete process.env.SUPPORT_AGENT_USER_ID;

  // B3 escalation with no draft -> ESCALATION_NOTICE on the case (Slack disabled in this test)
  const before = sent.length;
  const ex3 = await executePlay({ member_email: A.email, response: '', actions: [{ type: 'escalate', params: { note: 'test escalation' } }], case_id: cMsg });
  const m3 = sent[before];
  ok(ex3.ok && m3 && /escalated your case/.test(m3.text) && m3.headers['Message-ID'].startsWith(`<case-${cMsg}.`), 'escalation notice goes out on the case', JSON.stringify(ex3.steps.map((s) => s.step + ':' + s.ok)));

  // B4 a legacy play with no case_id -> attaches to the member's open case (never unrecorded)
  const ex4 = await executePlay({ member_email: A.email, response: 'Legacy play reply.', actions: [], case_id: null });
  ok(ex4.ok && ex4.steps.at(-1).case === cMsg, 'case-less legacy play is put on the member\'s open case', JSON.stringify(ex4.steps.at(-1)));

  console.log('\nC. Administrative recording + cancellation notice');
  const n0 = sent.length;
  const okReset = await sendResetLinkEmailSG({ email: A.email, userId: A.userId, token: 'TESTTOKEN123' });
  const [o5] = await sql`SELECT type, campaign, case_id, body FROM outbound_emails WHERE lower(to_email) = ${A.email} AND campaign = 'account_password_reset' AND sent_at >= ${T0} ORDER BY id DESC LIMIT 1`;
  ok(okReset && sent.length === n0 + 1 && o5?.type === 'administrative' && o5.case_id === null && o5.body.includes('TESTTOKEN123'), 'password reset recorded as administrative with full body, no case');

  const subA = 'sub_TESTCOMMS_' + Date.now(); subIds.push(subA);
  const k1 = await notifySubscriptionCancelled({ subscriptionId: subA, userId: A.userId, accessUntil: Math.floor(Date.parse('2026-11-20T12:00:00Z') / 1000), source: 'test' });
  const mc = sent.at(-1);
  const k2 = await notifySubscriptionCancelled({ subscriptionId: subA, userId: A.userId, source: 'test-webhook' });
  ok(k1.sent && /You keep access until November 20, 2026\./.test(mc.content[0].value), 'period-end cancel email says access continues until the period end', mc.content[0].value.replace(/\s+/g, ' ').slice(0, 160));
  ok(!k2.sent && k2.reason === 'already_notified', 'second cancel path for the same subscription sends nothing', JSON.stringify(k2));
  const [o6] = await sql`SELECT type, campaign, case_id FROM outbound_emails WHERE lower(to_email) = ${A.email} AND campaign = 'subscription_cancelled' AND sent_at >= ${T0} ORDER BY id DESC LIMIT 1`;
  ok(o6?.type === 'administrative' && o6.case_id === null, 'cancel email recorded as administrative, no case');

  const subB = 'sub_TESTCOMMS_IMM_' + Date.now(); subIds.push(subB);
  const k3 = await notifySubscriptionCancelled({ subscriptionId: subB, email: A.email, source: 'test' });
  ok(k3.sent && /Your access has ended\./.test(sent.at(-1).content[0].value), 'immediate cancel email says access has ended');

  const subC = 'sub_TESTCOMMS_BAN_' + Date.now(); subIds.push(subC);
  const n1 = sent.length;
  await suppressCancellationNotice({ subscriptionId: subC, reason: 'ban' });
  const k4 = await notifySubscriptionCancelled({ subscriptionId: subC, userId: A.userId, source: 'stripe_webhook' });
  ok(!k4.sent && k4.reason === 'suppressed' && sent.length === n1, 'a ban-suppressed subscription gets no cancel email', JSON.stringify(k4));

  ok(sent.every((m) => /@gymnasticbodies-test\.com$/.test(m.to)), `all ${sent.length} stubbed sends went to test addresses only`);
} finally {
  // Cleanup: everything this run created.
  const caseIds = [...createdCases];
  if (caseIds.length) {
    await sql`DELETE FROM support_replies WHERE email_id IN (SELECT id FROM support_emails WHERE case_id = ANY(${caseIds}))`;
    await sql`DELETE FROM support_emails WHERE case_id = ANY(${caseIds}) OR id = ANY(${[...createdEmails]})`;
    await sql`DELETE FROM outbound_emails WHERE case_id = ANY(${caseIds})`;
  }
  await sql`DELETE FROM outbound_emails WHERE lower(to_email) = ${A.email} AND sent_at >= ${T0}`;
  if (caseIds.length) await sql`DELETE FROM support_cases WHERE id = ANY(${caseIds})`;
  const marks = await sql`SELECT id, data FROM app_logs WHERE event LIKE 'subscription_cancelled.%' AND ts >= ${T0}`;
  const markIds = marks.filter((m) => { let d = m.data; for (let i = 0; i < 2; i++) if (typeof d === 'string') d = JSON.parse(d); return subIds.includes(d?.subscriptionId); }).map((m) => m.id);
  if (markIds.length) await sql`DELETE FROM app_logs WHERE id = ANY(${markIds})`;
  // Put the member's parked cases back as they were.
  for (const p of parked) await sql`UPDATE support_cases SET status = ${p.status}, resolved_at = ${p.resolved_at} WHERE id = ${p.id}`;
  console.log(`\ncleanup: ${caseIds.length} cases, ${markIds.length} markers removed; ${parked.length} parked cases restored`);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
