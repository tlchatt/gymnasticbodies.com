import { db } from '@/Drizzle';
import { pages } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';
import { getSiteSettings } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import HeroCarousel from '@/components/marketing/HeroCarousel';
import FitnessQuiz from '@/components/marketing/FitnessQuiz';
import ProgramGrid from '@/components/marketing/ProgramGrid';
import TestimonialsCarousel from '@/components/marketing/TestimonialsCarousel';
import BottomCta from '@/components/marketing/BottomCta';
import { ptToText } from '@/lib/ptUtils';

export async function generateMetadata() {
    const rows = await db.select().from(pages).where(eq(pages.slug, 'homepage'));
    const page = rows[0];
    if (!page) return {};
    return {
        title: page.title,
        description: page.meta?.description,
        alternates: { canonical: '/' },
        openGraph: {
            title: page.meta?.ogTitle || page.title,
            description: page.meta?.ogDescription || page.meta?.description,
            images: page.meta?.ogImage ? [{ url: page.meta.ogImage }] : [],
        },
    };
}

export default async function HomepagePage() {
    const [pageRows, { nav, footer, testimonials }] = await Promise.all([
        db.select().from(pages).where(eq(pages.slug, 'homepage')),
        getSiteSettings('nav', 'footer', 'testimonials'),
    ]);

    const page = pageRows[0];
    const content = page?.content || {};

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <HeroCarousel hero={content.hero || {}} />
            <FitnessQuiz
                heading={content.quiz?.heading}
                subtext={content.quiz?.subtext}
                ctaText={ptToText(content.quiz?.ctaText)}
            />
            <ProgramGrid
                heading={content.programs?.heading}
                subtext={content.programs?.subtext}
            />
            <TestimonialsCarousel
                heading={content.testimonials?.heading}
                testimonials={testimonials || []}
            />
            <BottomCta
                overline={content.cta?.overline}
                title={content.cta?.title}
                ctaHref={content.cta?.ctaHref || '/subscribe'}
                ctaText={content.cta?.ctaText}
                note={content.cta?.note}
            />
        </MarketingLayout>
    );
}
