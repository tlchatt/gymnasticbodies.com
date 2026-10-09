// Slack helpers for the cloud support agent: Web API calls, request-signature verification
// (for the interactivity webhook), and the Block Kit renderers for the play card. No Socket
// Mode — this is the HTTP/serverless surface. Creds from env (SLACK_BOT_TOKEN, etc.).
import crypto from 'node:crypto';
import { actionLabel } from './plays.js';

export const SUPPORT_CHANNEL = process.env.SLACK_SUPPORT_CHANNEL_ID;
export const FIRE_MINUTES = Number(process.env.SUPPORT_FIRE_MINUTES || 5);

export async function slack(method, body) {
  const res = await fetch('https://slack.com/api/' + method, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// Verify a Slack request signature over the RAW body (interactivity webhook).
export function verifySlackSignature(rawBody, headers) {
  const ts = headers.get('x-slack-request-timestamp');
  const sig = headers.get('x-slack-signature');
  if (!ts || !sig) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false; // replay guard
  const base = `v0:${ts}:${rawBody}`;
  const mine = 'v0=' + crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET).update(base).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(mine), Buffer.from(sig)); } catch { return false; }
}

// ---------- Block Kit ----------
const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// A short status badge shown on the top-level (parent) card so the channel is scannable at a glance.
export function statusBadge(status) {
  switch (status) {
    case 'scheduled': return '⏳ Scheduled';
    case 'firing': return '⚙️ Sending…';
    case 'fired': return '✅ Sent';
    case 'failed': return '⚠️ Sent (issues)';
    case 'held': return '❌ Reply held — action failed';
    case 'cancelled': return '↩️ Cancelled';
    case 'rejected': return '🚫 Rejected';
    case 'posted':
    case 'awaiting':
    default: return '🟠 Needs review';
  }
}

// Minimal parent in the channel — who + issue class + STATUS. The ENTIRE play (customer's message,
// findings, suggested reply, actions, buttons) lives in the thread. `extra` (e.g. " · case closed")
// is appended to the status when a transition has more to say.
export function summaryBlocks(fire, play, extra = '') {
  const issue = play?.issue_class || fire.issue_class || '';
  const issuePart = issue ? `  ·  _${issue}_` : '';
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `✉️ *${trunc(fire.member_email, 60)}*${issuePart}  ·  ${statusBadge(fire.status)}${extra}` } },
  ];
}

// The review card's content as plain data — one model for both surfaces: contentBlocks renders it
// as Block Kit for Slack, components/admin/SupportPlayCard renders it in /admin. Pure, no I/O.
export function cardModel(fire, play) {
  play = play || {};
  const actionList = (play.actions || []);
  const escalates = actionList.some((a) => a.type === 'escalate');
  const actionLines = [];
  if (fire.response && String(fire.response).trim()) actionLines.push(escalates ? 'Send reply (tells the member it is escalated to engineering)' : 'Send reply');
  for (const a of actionList) actionLines.push(actionLabel(a));
  const A = play.admin || {};
  const cm = play.customer_message;
  return {
    memberEmail: fire.member_email,
    issueClass: play.issue_class || fire.issue_class || 'other',
    caseId: A.caseId || fire.case_id || null,
    userId: A.userId || null,
    messageId: A.messageId || null,
    adminBase: A.base || null,
    runId: fire.run_id || null,
    customerMessage: cm && cm.body ? { subject: cm.subject || null, body: cm.body, date: cm.date || null } : null,
    findings: play.findings || '',
    reply: fire.response || '',
    actionLines,
    closesCase: actionList.some((a) => a.type === 'close_case'),
    openQuestions: play.open_questions || [],
    reviewerNote: play.reviewer_note || '',
  };
}

// Shared conversation content — header, context, customer's message, findings, suggested reply,
// actions. Every state renders this so the conversation stays visible; the states differ only by a
// status banner on top and the buttons at the bottom.
function contentBlocks(fire, play) {
  const m = cardModel(fire, play);
  const acts = m.actionLines.length ? m.actionLines.map((l) => `• ${l}`).join('\n') : '• _(nothing to do)_';
  const link = (path, label) => (m.adminBase ? `<${m.adminBase}${path}|${label}>` : label);
  const ctx = [
    `*${m.issueClass}*`,
    m.caseId ? link(`/admin/cases/${m.caseId}`, `case ${m.caseId}`) : 'case —',
    m.userId ? link(`/admin/users/${m.userId}`, '👤 customer') : null,
    `run ${m.runId || '—'}`,
  ].filter(Boolean).join(' · ');
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `📩 ${trunc(m.memberEmail, 60)}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: ctx }] },
  ];
  const cm = m.customerMessage;
  if (cm) {
    const msgLink = m.messageId ? ` · ${link(`/admin/ticket/${m.messageId}`, 'open in admin')}` : '';
    const meta = [cm.subject && `_${trunc(cm.subject, 120)}_`, cm.date && `· ${cm.date}`].filter(Boolean).join(' ');
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Customer's message*${meta ? ` ${meta}` : ''}${msgLink}\n>${trunc(cm.body, 1200).replace(/\n/g, '\n>')}` } });
  }
  blocks.push(
    { type: 'section', text: { type: 'mrkdwn', text: `*Findings*\n${trunc(m.findings, 900) || '_none_'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Suggested reply*\n>${trunc(m.reply, 1400).replace(/\n/g, '\n>') || '_none_'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Actions*\n${acts}` } },
  );
  if (m.closesCase) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: '↩️ Closing re-opens automatically if the customer replies.' }] });
  if (m.openQuestions.length) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `⚠️ ${m.openQuestions.map((q) => trunc(q, 120)).join(' · ')}` }] });
  return blocks;
}

// Posted (awaiting a decision): full content + Accept + the reply-in-thread invite.
export function playBlocks(fire, play) {
  const blocks = contentBlocks(fire, play);
  blocks.push({ type: 'actions', block_id: 'play', elements: [
    { type: 'button', style: 'primary', text: { type: 'plain_text', text: 'Accept' }, action_id: 'accept', value: String(fire.id) },
  ] });
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: '💬 Or reply to this message with dictated updates or further questions for the agent.' }] });
  return blocks;
}

// Scheduled: a countdown banner ON TOP of the full content + Undo — content is preserved, not replaced.
export function scheduledBlocks(fire, play, fireAt) {
  const ts = Math.floor(new Date(fireAt).getTime() / 1000);
  const secsLeft = ts - Math.floor(Date.now() / 1000);
  const past = secsLeft <= 5;
  const mins = Math.ceil(secsLeft / 60);
  const banner = past ? '⚙️ *Firing now…*' : `⏳ *Scheduled — fires in ~${mins} min* (at <!date^${ts}^{time}|soon>) · press *Undo* to cancel`;
  const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: banner } }, ...contentBlocks(fire, play)];
  if (!past) blocks.push({ type: 'actions', block_id: 'sched', elements: [{ type: 'button', style: 'danger', text: { type: 'plain_text', text: 'Undo' }, action_id: 'undo', value: String(fire.id) }] });
  return blocks;
}

// Done (sent / cancelled): a status banner ON TOP of the full content, no buttons — conversation stays.
export function doneBlocks(statusText, fire, play) {
  return [{ type: 'section', text: { type: 'mrkdwn', text: statusText } }, ...contentBlocks(fire, play)];
}
