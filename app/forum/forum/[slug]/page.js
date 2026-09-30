import { notFound, permanentRedirect } from 'next/navigation';
import { getSiteSettings } from '@/lib/siteSettings';
import { loadForumListingView } from '@/lib/forumView';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ForumTopicListView from '@/components/forum/ForumTopicListView';

// A forum's topic list: /forum/forum/{id}-{slug} (matched by numeric id).
// Rendered on first request, then cached (the forum data is frozen).
export const revalidate = 86400;

export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const view = await loadForumListingView(slug);
    return view.status === 'ok' ? view.metadata : {};
}

export default async function ForumListingPage({ params }) {
    const { slug } = await params;
    const [view, { nav, footer }] = await Promise.all([
        loadForumListingView(slug),
        getSiteSettings('nav', 'footer'),
    ]);
    if (view.status === 'notFound') notFound();
    if (view.status === 'redirect') permanentRedirect(view.to);

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ForumTopicListView {...view.props} />
        </MarketingLayout>
    );
}
