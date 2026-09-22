import { logger } from '@/lib/logger';

// Fire the support agent for a case: POST /api/support/case, verify it ACTUALLY posted to Slack
// (res.ok AND body.ok), and retry ONCE on failure. The main failure mode — the transient
// "could not parse agent JSON" from the LLM — happens before anything is posted or written, so a
// second pass is safe and usually succeeds (see the case-612 retry). Every outcome is logged, so a
// reply can never again silently fail to reach Slack with no trace.
export async function fireCaseToSlack({ email, caseId, base }) {
  const url = `${base || process.env.SUPPORT_PUBLIC_URL || 'https://app.gymnasticbodies.com'}/api/support/case`;
  const body = JSON.stringify({ email, caseId });
  let lastErr = 'unknown';
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        if (attempt > 1) logger.info('support.autofire.retry_ok', { email, caseId, attempt, fireId: j.fireId });
        return { ok: true, fireId: j.fireId };
      }
      lastErr = j.error || `http ${res.status}`;
    } catch (e) {
      lastErr = e.message;
    }
    if (attempt < 2) {
      logger.warn('support.autofire.retry', { email, caseId, attempt, error: lastErr });
      await new Promise((s) => setTimeout(s, 1500));
    }
  }
  logger.error('support.autofire.failed', { email, caseId, error: lastErr });
  return { ok: false, error: lastErr };
}
