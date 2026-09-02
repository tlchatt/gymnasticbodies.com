// The cloud investigation agent — "front" of the gate. Read-only: it calls Claude (via the
// Vercel AI SDK + your ANTHROPIC_API_KEY) with the ported read-only tools and the playbook, and
// returns the { findings, issue_class, recommended_actions, open_questions } play JSON. It never
// writes — the account changes happen later, behind the human gate, in the fire step.
import { generateText, tool, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { neon } from '@neondatabase/serverless';
import * as T from './tools.js';

// Default: route through the Vercel AI Gateway — billed via Vercel, so NO per-provider key or
// Gemini/Anthropic billing to set up. Auth is automatic on Vercel (OIDC); locally it uses an
// AI_GATEWAY_API_KEY. Model swaps by a plain string, e.g. "google/gemini-2.5-flash" or
// "anthropic/claude-haiku-4-5" — no code change.
//   SUPPORT_LLM_PROVIDER = gateway (default) | google | anthropic   (last two call a provider directly with its own key)
const PROVIDER = process.env.SUPPORT_LLM_PROVIDER || 'gateway';
const MODEL = process.env.SUPPORT_AGENT_MODEL || (PROVIDER === 'gateway' ? 'google/gemini-2.5-flash' : PROVIDER === 'anthropic' ? 'claude-haiku-4-5' : 'gemini-2.5-flash');
const model = () => {
  if (PROVIDER === 'anthropic') return anthropic(MODEL);
  if (PROVIDER === 'google') return google(MODEL);
  return MODEL; // gateway: a bare "creator/model" string is routed through the Vercel AI Gateway by the `ai` package
};
const emailSchema = z.object({ email: z.string().describe('the member email') });

const tools = {
  lookupMember: tool({ description: T.TOOL_DESCRIPTIONS.lookupMember, inputSchema: emailSchema, execute: T.lookupMember }),
  memberBilling: tool({ description: T.TOOL_DESCRIPTIONS.memberBilling, inputSchema: emailSchema, execute: T.memberBilling }),
  priorFollowup: tool({ description: T.TOOL_DESCRIPTIONS.priorFollowup, inputSchema: emailSchema, execute: T.priorFollowup }),
  supportHistory: tool({ description: T.TOOL_DESCRIPTIONS.supportHistory, inputSchema: emailSchema, execute: T.supportHistory }),
  workoutState: tool({ description: T.TOOL_DESCRIPTIONS.workoutState, inputSchema: emailSchema, execute: T.workoutState }),
  recentActivity: tool({ description: T.TOOL_DESCRIPTIONS.recentActivity, inputSchema: emailSchema, execute: T.recentActivity }),
  searchCaseHistory: tool({ description: T.TOOL_DESCRIPTIONS.searchCaseHistory, inputSchema: z.object({ query: z.string().describe('keywords describing the issue') }), execute: T.searchCaseHistory }),
};

function extractJson(s) {
  if (!s) return null;
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : s;
  const start = body.indexOf('{'), end = body.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(body.slice(start, end + 1)); } catch { return null; }
}

async function loadPlaybook() {
  try {
    const sql = neon(process.env.DATABASE_URL);
    const p = await sql`SELECT content FROM support_playbook WHERE name='global' AND status='active' ORDER BY updated_at DESC LIMIT 1`;
    if (p[0]?.content) return p[0].content;
  } catch { /* fall through */ }
  return 'You are a GymnasticBodies support-ops investigator. Investigate read-only and recommend; do not take actions.';
}

const OUTPUT = `
Return ONLY a JSON object (no prose outside it) shaped as:
{
  "findings": "evidence-backed summary (cite amounts, dates, statuses)",
  "issue_class": "billing | access | login | schedule | video | legacy | cancel | delete | duplicate | other",
  "recommended_actions": [
    { "type": "reply | credit | refund | grant | cancel | merge_cases | close_case | reopen | reassign | none",
      "risk": "routine | sensitive",
      "summary": "one line",
      "draft_email": "full customer reply if type=reply (or the reply that accompanies an action)",
      "params": { } }
  ],
  "open_questions": ["anything a human must decide before applying"],
  "reviewer_note": "ONLY in refine mode: a BRIEF (1-2 sentence max) first-person note to the SUPPORT REVIEWER that confirms ONLY the specific change you just made, or directly answers their exact question. Do NOT restate the member's situation, findings, or any context the reviewer already has — they asked for a change, just confirm the change (e.g. 'Added a 1-week credit and a close_case action.'). Empty otherwise."
}`;

// Investigate one member/case and return the parsed play (or throw).
// mode 'refine' = a support reviewer replied in the Slack thread with a note about the current draft;
// address it, revise the draft, and fill reviewer_note with a conversational reply to them.
export async function investigate({ email, ask, mode }) {
  const playbook = await loadPlaybook();
  const today = new Date().toISOString().slice(0, 10);
  const refine = mode === 'refine';
  const askLine = refine
    ? `A SUPPORT REVIEWER (a human teammate, NOT the customer) replied in the review thread with this note about the current suggested reply: "${ask}"`
    : (ask ? `Their message / the question: ${ask}` : '(no specific message — give a general account picture + anything needing attention)');
  const prompt = `Investigate this GymnasticBodies member and return the JSON play.

TODAY'S DATE: ${today}. Use this for any relative time reasoning. NEVER say "today", "yesterday",
or "earlier today" unless the date truly matches ${today} — cite the actual date instead (e.g.
"on 2026-08-22", "two days ago").

Member email: ${email}
${askLine}

Gather evidence with ALL the read-only tools: the member's full picture (lookupMember, memberBilling, priorFollowup, supportHistory, workoutState), and ALWAYS searchCaseHistory for how we handled this SAME kind of issue before. Make the reply + actions consistent with that precedent and the playbook (credit sizing, refunds only for billing errors, the legacy offer, resolve-before-reply, tone).

ALWAYS call recentActivity too — it is the member's recent ACTION LOG (logins, password resets, renew-page views, payment setup, in-app messages). The situation may have MOVED since they wrote in: if the log shows they already resolved it themselves (e.g. reset their password and logged in, or asked to close the ticket), your findings must say so and you should prefer close_case / none over sending a now-stale reply. Cite the actual events and times from this log in your findings.

BE COMPLETE ON THE FIRST PASS: put EVERY action the situation warrants into recommended_actions in this one response — the reply PLUS every applicable account/case action (credit, refund, grant, cancel, merge_cases, close_case, and so on). Do not hand back a partial set expecting a human to notice and add the rest. Only propose an action the system can actually execute with the params you provide (match the exact param names each action expects); do not invent an action or a capability that does not exist.

CLOSE ONLY WHEN RESOLVED: include a close_case action when the issue is actually resolved — the member self-resolved it (e.g. they reset their password and logged in, or asked to close), OR your reply fully answers/fixes it and needs no further action from us or them. Do NOT close an UNRESOLVED problem: if the member still can't do the thing (login still failing, access still missing, a bug not yet fixed on our side), leave the case OPEN and make the reply do real troubleshooting or concrete next steps — never a generic "sorry for the inconvenience" apology-and-close. When you do include close_case, note that closing auto-reopens if the customer replies.

KNOW WHAT YOU DON'T KNOW: only assert what the tools actually returned. If you have no data on a topic — a question the reviewer asks, a claim, a piece of history — say so plainly ("I don't have data on that in our systems" / "I can't confirm that from what I can see") in findings, open_questions, and reviewer_note. NEVER invent facts, dates, amounts, entitlements, or events you did not retrieve. Absence of evidence is a valid, useful answer.
${refine ? `\nThis is REFINE mode: the reviewer is directing you. Do exactly what their note asks — re-verify against the tools (e.g. if they ask "did we check Stripe?", actually call memberBilling and report what it shows) and revise the customer draft_email / actions accordingly. Then write reviewer_note as a SHORT confirmation of just the change you made, or a direct answer to their exact question. Do NOT re-summarize the member's situation, history, or the findings — the reviewer already has all that, and repeating it is noise they explicitly do not want. reviewer_note is a quick note to the reviewer; draft_email is for the customer — keep them separate.\n` : ''}
VERIFY BEFORE YOU FINALIZE (factuality step): re-read your draft reply and check every factual
claim against the evidence you actually gathered — dates (against TODAY'S DATE above), dollar
amounts, subscription status, and anything you assert we "already sent" or "already did". Do not
invent specifics. If you can't verify a claim from the tools, remove it or soften it. A wrong date
or an invented detail in a customer reply is a failure.

Recommend only — do NOT take any action.`;

  const { text } = await generateText({
    model: model(),
    system: playbook + '\n\n' + OUTPUT,
    prompt,
    tools,
    stopWhen: stepCountIs(14),
  });

  const play = extractJson(text);
  if (!play) throw new Error('could not parse agent JSON');
  return play;
}
