import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

// Returns the session user if they're an admin, or a 403 NextResponse.
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || session.user.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { user: session.user };
}

// Server-to-server callers (Vercel cron, the support autofire) prove themselves with
// CRON_SECRET: `Authorization: Bearer <CRON_SECRET>` (what Vercel cron sends) or `x-cron-secret`.
export function hasCronSecret(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (request.headers.get('x-cron-secret') === secret) return true;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

// Admin session OR CRON_SECRET; null when allowed, else a 403 response to return.
export async function requireAdminOrCronSecret(request) {
  if (hasCronSecret(request)) return null;
  const { error } = await requireAdmin();
  return error ?? null;
}
