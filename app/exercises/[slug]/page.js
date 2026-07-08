import { db } from '@/Drizzle';
import { pages } from '@/Drizzle/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import ExerciseArticle from './ExerciseArticle';

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const rows = await db.select().from(pages).where(and(eq(pages.slug, `exercises/${slug}`), eq(pages.type, 'exercise')));
    const ex = rows[0];
    if (!ex) return {};
    return {
        title: ex.title,
        description: ex.meta?.description,
        openGraph: {
            title: ex.meta?.ogTitle || ex.title,
            description: ex.meta?.ogDescription,
            images: ex.meta?.ogImage ? [{ url: ex.meta.ogImage }] : [],
            type: 'article',
        },
    };
}

export const dynamic = 'force-dynamic';

export default async function ExercisePage({ params }) {
    const { slug } = await params;

    const [rows, { nav, footer }] = await Promise.all([
        db.select().from(pages).where(and(eq(pages.slug, `exercises/${slug}`), eq(pages.type, 'exercise'))),
        getSiteSettings('nav', 'footer'),
    ]);

    const exercise = rows[0];
    if (!exercise) notFound();

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <ExerciseArticle exercise={exercise} />
        </MarketingLayout>
    );
}
