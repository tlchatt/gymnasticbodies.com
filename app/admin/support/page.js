import { PageHeader } from '@/components/ui';
import SupportFireList from '@/components/admin/SupportFireList';
import { listFires } from '@/lib/support/fireQueue';
import content from '@/data/content/adminSupport.json';

export const metadata = { title: content.metadata.title };
export const dynamic = 'force-dynamic';

// /admin/support — the support agent's review queue (same support_fires rows + cards as Slack).
// Gated by proxy.ts like every /admin page; the data routes check requireAdmin().
export default async function SupportPage() {
  const fires = await listFires({ status: 'posted' });
  const intro = { color: 'var(--text-subtle)', fontSize: 14, margin: '-8px 0 20px', maxWidth: 760, lineHeight: 1.5 };
  return (
    <>
      <PageHeader title={content.page.title} />
      <p style={intro}>{content.page.intro}</p>
      <SupportFireList initialFires={fires} initialStatus="posted" />
    </>
  );
}
