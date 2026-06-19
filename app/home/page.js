import { getSiteSettings, getPage } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ContentHero from '@/components/marketing/ContentHero';
import ProgramGrid from '@/components/marketing/ProgramGrid';
import TestimonialsCarousel from '@/components/marketing/TestimonialsCarousel';
import BottomCta from '@/components/marketing/BottomCta';
import { ptToText } from '@/lib/ptUtils';

export const metadata = {
    title: 'GymFit by Gymnastic Bodies',
    description: 'Move like you were built for it. Restore mobility and build real strength with 700+ guided exercises and programs for every level.',
};

export default async function Home() {
    const [page, { nav, footer, testimonials }] = await Promise.all([
        getPage('homepage'),
        getSiteSettings('nav', 'footer', 'testimonials'),
    ]);

    const content = page?.content || {};

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ContentHero hero={content.hero || {}} />
            <ProgramGrid
                heading={content.programs?.heading}
                subtext={content.programs?.subtext}
            />
            {testimonials && (
                <TestimonialsCarousel
                    heading={content.testimonials?.heading}
                    testimonials={Array.isArray(testimonials) ? testimonials : []}
                />
            )}
            <BottomCta
                overline={ptToText(content.cta?.overline)}
                title={ptToText(content.cta?.title)}
                ctaHref={content.cta?.ctaHref || '/subscribe'}
                ctaText={ptToText(content.cta?.ctaText)}
                note={ptToText(content.cta?.note)}
            />
        </MarketingLayout>
    );
}
