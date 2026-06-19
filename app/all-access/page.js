import { getSiteSettings, getPage } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ContentHero from '@/components/marketing/ContentHero';
import FaqAccordion from '@/components/marketing/FaqAccordion';
import FeaturesList from '@/components/marketing/FeaturesList';
import BottomCta from '@/components/marketing/BottomCta';
import { ptToText } from '@/lib/ptUtils';

export async function generateMetadata() {
    const page = await getPage('all-access');
    if (!page) return {};
    return {
        title: page.title,
        description: page.meta?.description,
        openGraph: { title: page.meta?.ogTitle, description: page.meta?.ogDescription, images: page.meta?.ogImage ? [{ url: page.meta.ogImage }] : [] },
    };
}

export default async function AllAccess() {
    const [page, { nav, footer }] = await Promise.all([
        getPage('all-access'),
        getSiteSettings('nav', 'footer'),
    ]);

    const content = page?.content || {};
    const features = content.features || {};
    const faq = content.faq || [];

    // Convert PortableText features to plain string format for existing FeaturesList component
    const featureItems = (features.items || []).map(item => ({
        label: ptToText(item.label),
        detail: ptToText(item.detail),
    }));

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ContentHero hero={content.hero || {}} />
            {featureItems.length > 0 && (
                <FeaturesList
                    title={ptToText(features.title)}
                    subtitle={ptToText(features.subtitle)}
                    items={featureItems}
                />
            )}
            {faq.length > 0 && (
                <FaqAccordion
                    heading={[{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Common questions.' }] }]}
                    items={faq}
                />
            )}
            <BottomCta
                overline="7 days free"
                title="Start training today."
                ctaHref="/subscribe"
                ctaText="Get Started →"
                note="No credit card required"
            />
        </MarketingLayout>
    );
}
