import { notFound, permanentRedirect } from 'next/navigation';
import { getSiteSettings } from '@/lib/siteSettings';
import { loadTopicView } from '@/lib/forumView';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ForumTopicView from '@/components/forum/ForumTopicView';

// Page N of a topic: /forum/topic/{tid}-{slug}/page/{n}.
// Rendered on first request, then cached (the forum data is frozen).
export const revalidate = 86400;

export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params }) {
    const { slug, n } = await params;
    const view = await loadTopicView(slug, n);
    return view.status === 'ok' ? view.metadata : {};
}

export default async function ForumTopicPage({ params }) {
    const { slug, n } = await params;
    const [view, { nav, footer }] = await Promise.all([
        loadTopicView(slug, n),
        getSiteSettings('nav', 'footer'),
    ]);
    if (view.status === 'notFound') notFound();
    if (view.status === 'redirect') permanentRedirect(view.to);

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ForumTopicView {...view.props} />
        </MarketingLayout>
    );
}
