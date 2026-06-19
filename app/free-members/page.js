import { getSiteSettings, getPage } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ContentHero from '@/components/marketing/ContentHero';
import BottomCta from '@/components/marketing/BottomCta';
import { ptToText } from '@/lib/ptUtils';

export async function generateMetadata() {
    const page = await getPage('free-members');
    if (!page) return {};
    return {
        title: page.title,
        description: page.meta?.description,
        openGraph: { title: page.meta?.ogTitle, description: page.meta?.ogDescription, images: page.meta?.ogImage ? [{ url: page.meta.ogImage }] : [] },
    };
}

export default async function FreeMembers() {
    const [page, { nav, footer }] = await Promise.all([
        getPage('free-members'),
        getSiteSettings('nav', 'footer'),
    ]);

    const content = page?.content || {};

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ContentHero hero={content.hero || {}} />
            <BottomCta
                overline="Ready for more?"
                title="Unlock every program."
                ctaHref="/subscribe"
                ctaText="Start Free Trial →"
                note="7 days free · Cancel anytime"
            />
        </MarketingLayout>
    );
}
