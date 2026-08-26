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

// Minimal parent in the channel — nothing but who + issue class. The ENTIRE play (customer's
// message, findings, suggested reply, actions, buttons) lives in the thread.
export function summaryBlocks(fire, play) {
  return [
    { type: 'section', text: { type: 'mrkdwn', text: `✉️ *${trunc(fire.member_email, 60)}*  ·  _${play.issue_class}_` } },
  ];
}

export function playBlocks(fire, play) {
  const acts = (play.actions || []).map((a) => `• ${actionLabel(a)}`).join('\n') || '• _(reply only)_';
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
  const when = `<!date^${Math.floor(new Date(fireAt).getTime() / 1000)}^{time}|soon>`;
  return [
    { type: 'header', text: { type: 'plain_text', text: `⏳ Scheduled · ${trunc(fire.member_email, 60)}` } },
    { type: 'section', text: { type: 'mrkdwn', text: `Fires ${when} (${FIRE_MINUTES} min). Sends the reply${(play.actions || []).length ? ` and applies: ${play.actions.map(actionLabel).join(', ')}` : ''}.` } },
    { type: 'section', text: { type: 'mrkdwn', text: `>${trunc(fire.response, 800).replace(/\n/g, '\n>')}` } },
    { type: 'actions', block_id: 'sched', elements: [{ type: 'button', style: 'danger', text: { type: 'plain_text', text: 'Undo' }, action_id: 'undo', value: String(fire.id) }] },
  ];
}

export const doneBlocks = (title, fire) => ([
  { type: 'section', text: { type: 'mrkdwn', text: `${title} · *${trunc(fire.member_email, 60)}* (case ${fire.case_id || '—'})` } },
]);
