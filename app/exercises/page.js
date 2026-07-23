import { db } from '@/Drizzle';
import { pages } from '@/Drizzle/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getSiteSettings } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ExercisesClient from './ExercisesClient';

export const metadata = {
    title: 'Exercise Library',
    description: 'Browse 355 Gymnastic Bodies exercises — bodyweight, ring, and mobility movements, each with a demonstration video and coaching notes.',
    alternates: { canonical: '/exercises' },
};

export const dynamic = 'force-dynamic';

export default async function ExercisesIndex() {
    const [{ nav, footer }, rows] = await Promise.all([
        getSiteSettings('nav', 'footer'),
        db.select({
            slug: pages.slug,
            title: pages.title,
            featuredImage: pages.featuredImage,
        })
            .from(pages)
            .where(and(eq(pages.type, 'exercise'), eq(pages.status, 'published')))
            .orderBy(asc(pages.title)),
    ]);

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ExercisesClient exercises={rows} />
        </MarketingLayout>
    );
}
