// Play model — pure helpers to turn an agent run's JSON into the { response, actions } play the
// Slack card shows and the fire queue stores. No side effects, no AI. Ported from the local
// supportAgent CLI (claudeTools/supportAgent/lib/plays.js) so both surfaces share one model.

// The agent emits the playbook JSON:
//   { member, findings, issue_class, recommended_actions:[{type,risk,summary,draft_email,params}], open_questions }
// The customer-facing reply is a reply action's draft_email; account changes are the rest.
export function extractPlay(raw) {
  const acts = Array.isArray(raw?.recommended_actions) ? raw.recommended_actions : [];
  const replyAct = acts.find((a) => a.type === 'reply' && a.draft_email) || acts.find((a) => a.draft_email);
  const response = replyAct?.draft_email || '';
  const actions = acts.filter((a) => a.type && a.type !== 'reply' && a.type !== 'none');
  return {
    response,
    actions,
    findings: raw?.findings || '',
    issue_class: raw?.issue_class || 'other',
    open_questions: Array.isArray(raw?.open_questions) ? raw.open_questions : [],
    reviewer_note: raw?.reviewer_note || '', // conversational reply to the support reviewer (refine mode)
  };
}

// One-line human summary of an account/case action for the Slack card.
export function actionLabel(a) {
  const p = a.params || {};
  if (a.type === 'credit') return `credit ${p.months ? p.months + ' month(s)' : (p.days || 7) + ' day(s)'}${p.reason ? ` — ${p.reason}` : ''}`;
  if (a.type === 'refund') return `refund ${p.amount != null ? '$' + p.amount : 'last charge'}${p.reason ? ` — ${p.reason}` : ''}`;
  if (a.type === 'grant') return `grant access${p.until ? ` until ${p.until}` : (p.months ? ` for ${p.months} month(s)` : '')}`;
  if (a.type === 'cancel') return `cancel subscription${p.immediate ? ' (immediate)' : ' (period end)'}`;
  if (a.type === 'merge_cases' || a.type === 'merge') return `merge cases${p.into ? ` into #${p.into}` : ''}`;
  if (a.type === 'close_case') return `close case${p.case_id ? ` #${p.case_id}` : ''}`;
  if (a.type === 'reopen') return `reopen case${p.case_id ? ` #${p.case_id}` : ''}`;
  if (a.type === 'reassign') return `reassign${p.assigned_to ? ` to ${p.assigned_to}` : ''}`;
  if (a.type === 'delete') return 'delete account';
  return `${a.type}${a.summary ? ` — ${a.summary}` : ''}`;
}
