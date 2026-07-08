import { db } from '@/Drizzle';
import { pages } from '@/Drizzle/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import BlogArticle from '../blog/[slug]/BlogArticle';
import ContentArticle from './ContentArticle';

// This single-segment dynamic route serves both migrated blog posts and migrated
// standalone WP content pages (type='page'), both stored with a bare slug.
async function loadEntry(slug) {
    const rows = await db.select().from(pages)
        .where(and(eq(pages.slug, slug), inArray(pages.type, ['blog_post', 'page'])));
    return rows[0] || null;
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const entry = await loadEntry(slug);
    if (!entry) return {};
    return {
        title: entry.title,
        description: entry.meta?.description,
        openGraph: {
            title: entry.meta?.ogTitle || entry.title,
            description: entry.meta?.ogDescription,
            images: entry.meta?.ogImage ? [{ url: entry.meta.ogImage }] : [],
            type: 'article',
            publishedTime: entry.publishedAt,
        },
    };
}

export const dynamic = 'force-dynamic';

export default async function EntryPage({ params }) {
    const { slug } = await params;

    const [entry, { nav, footer }] = await Promise.all([
        loadEntry(slug),
        getSiteSettings('nav', 'footer'),
    ]);

    if (!entry) notFound();

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            {entry.type === 'blog_post'
                ? <BlogArticle post={entry} />
                : <ContentArticle page={entry} />}
        </MarketingLayout>
    );
}
