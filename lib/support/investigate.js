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
  "reviewer_note": "ONLY in refine mode: a short (1-3 sentence) first-person reply to the SUPPORT REVIEWER (not the customer) — answer their question/instruction from the evidence and say what you changed in the draft. Empty otherwise."
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
${refine ? `\nThis is REFINE mode: the reviewer is directing you. Do exactly what their note asks — re-verify against the tools (e.g. if they ask "did we check Stripe?", actually call memberBilling and report what it shows), revise the customer draft_email accordingly, and write reviewer_note as a direct conversational reply to THEM (first person, answer their question, state what you changed in the draft). reviewer_note is for the reviewer; draft_email is for the customer — keep them separate.\n` : ''}
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
