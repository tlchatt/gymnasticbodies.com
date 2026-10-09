// GET /api/support/fires?status=posted|scheduled|fired|failed|held|cancelled&caseId=123
// The support_fires queue for the admin review card (/admin/support, /admin/cases/[id]).
// Admin only. Query + shape live in lib/support/fireQueue.js (shared with the server pages).
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { listFires, FIRE_STATUSES } from '@/lib/support/fireQueue';

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  if (status && !FIRE_STATUSES.includes(status)) return NextResponse.json({ error: 'bad status' }, { status: 400 });
  const fires = await listFires({ status, caseId: searchParams.get('caseId'), limit: searchParams.get('limit') });
  return NextResponse.json({ fires });
}
