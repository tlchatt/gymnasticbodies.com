import { getSiteSettings } from '@/lib/siteSettings';
import { loadForumIndexView, forumIndexMetadata } from '@/lib/forumView';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ForumIndexView from '@/components/forum/ForumIndexView';

// Read-only forum index, rendered from Neon. The forum data is frozen, so the page
// is cached and refreshed at most once a day.
export const revalidate = 86400;

export const metadata = forumIndexMetadata;

export default async function ForumIndexPage() {
    const [view, { nav, footer }] = await Promise.all([
        loadForumIndexView(),
        getSiteSettings('nav', 'footer'),
    ]);

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ForumIndexView {...view} />
        </MarketingLayout>
    );
}
