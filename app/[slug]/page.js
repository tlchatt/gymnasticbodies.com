import { db } from '@/Drizzle';
import { pages } from '@/Drizzle/db/schema';
import { eq, and } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import BlogArticle from '../blog/[slug]/BlogArticle';

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const rows = await db.select().from(pages).where(and(eq(pages.slug, slug), eq(pages.type, 'blog_post')));
    const post = rows[0];
    if (!post) return {};
    return {
        title: post.title,
        description: post.meta?.description,
        openGraph: {
            title: post.meta?.ogTitle || post.title,
            description: post.meta?.ogDescription,
            images: post.meta?.ogImage ? [{ url: post.meta.ogImage }] : [],
            type: 'article',
            publishedTime: post.publishedAt,
        },
    };
}

export const dynamic = 'force-dynamic';

export default async function BlogPostPage({ params }) {
    const { slug } = await params;

    const [rows, { nav, footer }] = await Promise.all([
        db.select().from(pages).where(and(eq(pages.slug, slug), eq(pages.type, 'blog_post'))),
        getSiteSettings('nav', 'footer'),
    ]);

    const post = rows[0];
    if (!post) notFound();

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <BlogArticle post={post} />
        </MarketingLayout>
    );
}
