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

export function playBlocks(fire, play) {
  // Actions read as the full plan: the reply send first, then each account/case action.
  const actionList = (play.actions || []);
  const lines = [];
  if (fire.response && String(fire.response).trim()) lines.push('Send reply');
  for (const a of actionList) lines.push(actionLabel(a));
  const acts = lines.length ? lines.map((l) => `• ${l}`).join('\n') : '• _(nothing to do)_';
  const closesCase = actionList.some((a) => a.type === 'close_case');
  const A = play.admin || {};
  const caseId = A.caseId || fire.case_id || null;
  const link = (path, label) => (A.base ? `<${A.base}${path}|${label}>` : label);
  const ctx = [
    `*${play.issue_class}*`,
    caseId ? link(`/admin/cases/${caseId}`, `case ${caseId}`) : 'case —',
    A.userId ? link(`/admin/users/${A.userId}`, '👤 customer') : null,
    `run ${fire.run_id || '—'}`,
  ].filter(Boolean).join(' · ');
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `📩 ${trunc(fire.member_email, 60)}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: ctx }] },
  ];
  const cm = play.customer_message;
  if (cm && cm.body) {
    const msgLink = A.messageId ? ` · ${link(`/admin/ticket/${A.messageId}`, 'open in admin')}` : '';
    const meta = [cm.subject && `_${trunc(cm.subject, 120)}_`, cm.date && `· ${cm.date}`].filter(Boolean).join(' ');
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Customer's message*${meta ? ` ${meta}` : ''}${msgLink}\n>${trunc(cm.body, 1200).replace(/\n/g, '\n>')}` } });
  }
  blocks.push(
    { type: 'section', text: { type: 'mrkdwn', text: `*Findings*\n${trunc(play.findings, 900) || '_none_'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Suggested reply*\n>${trunc(fire.response, 1400).replace(/\n/g, '\n>') || '_none_'}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `*Actions*\n${acts}` } },
  );
  if (closesCase) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: '↩️ Closing re-opens automatically if the customer replies.' }] });
  if (play.open_questions?.length) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `⚠️ ${play.open_questions.map((q) => trunc(q, 120)).join(' · ')}` }] });
  blocks.push({
    type: 'actions', block_id: 'play', elements: [
      { type: 'button', style: 'primary', text: { type: 'plain_text', text: 'Accept' }, action_id: 'accept', value: String(fire.id) },
    ],
  });
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: '💬 Or reply to this message with dictated updates or further questions for the agent.' }] });
  return blocks;
}

export function scheduledBlocks(fire, play, fireAt) {
  const ts = Math.floor(new Date(fireAt).getTime() / 1000);
  const secsLeft = ts - Math.floor(Date.now() / 1000);
  const mins = Math.ceil(secsLeft / 60);
  const past = secsLeft <= 5;
  const countdown = past ? '⚙️ *Firing now…*' : `⏳ *Fires in ~${mins} min* (at <!date^${ts}^{time}|soon>)`;
  const applies = (play.actions || []).length ? ` and apply: ${play.actions.map(actionLabel).join(', ')}` : '';
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `⏳ Scheduled · ${trunc(fire.member_email, 60)}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `${countdown}${past ? '' : ' — press *Undo* to cancel'}.\nWill send the reply${applies}.` } },
    { type: 'section', text: { type: 'mrkdwn', text: `>${trunc(fire.response, 800).replace(/\n/g, '\n>')}` } },
  ];
  // Undo only makes sense while the fuse is still counting down — hide it once we're firing.
  if (!past) blocks.push({ type: 'actions', block_id: 'sched', elements: [{ type: 'button', style: 'danger', text: { type: 'plain_text', text: 'Undo' }, action_id: 'undo', value: String(fire.id) }] });
  return blocks;
}

export const doneBlocks = (title, fire) => ([
  { type: 'section', text: { type: 'mrkdwn', text: `${title} · *${trunc(fire.member_email, 60)}* (case ${fire.case_id || '—'})` } },
]);
