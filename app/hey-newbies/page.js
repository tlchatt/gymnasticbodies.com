import { getSiteSettings, getPage } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ContentHero from '@/components/marketing/ContentHero';
import ContentSection from '@/components/marketing/ContentSection';
import ProgramGrid from '@/components/marketing/ProgramGrid';
import { ptToText } from '@/lib/ptUtils';

export async function generateMetadata() {
    const page = await getPage('hey-newbies');
    if (!page) return {};
    return {
        title: page.title,
        description: page.meta?.description,
        openGraph: { title: page.meta?.ogTitle, description: page.meta?.ogDescription, images: page.meta?.ogImage ? [{ url: page.meta.ogImage }] : [] },
    };
}

export default async function HeyNewbies() {
    const [page, { nav, footer }] = await Promise.all([
        getPage('hey-newbies'),
        getSiteSettings('nav', 'footer'),
    ]);

    const content = page?.content || {};

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ContentHero hero={content.hero || {}} />
            {(content.sections || []).map((section, i) => (
                <ContentSection
                    key={i}
                    heading={section.heading}
                    body={section.body}
                    image={section.image}
                    accent={i % 2 !== 0}
                />
            ))}
            <ProgramGrid
                heading={[{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Find your program.' }] }]}
                subtext={[{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: 'Every level. Every goal. Every age.' }] }]}
            />
        </MarketingLayout>
    );
}
