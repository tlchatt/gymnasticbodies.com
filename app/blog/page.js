import { db } from '@/Drizzle';
import { pages } from '@/Drizzle/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getSiteSettings } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import BlogGrid from '@/components/marketing/BlogGrid';
import { GetSettings } from '@/lib/GetSettings';

export const metadata = {
    title: 'Blog',
    description: 'Insights on gymnastic strength training, mobility, and movement from Gymnastic Bodies.',
};

const PER_PAGE = 12;

export default async function Blog({ searchParams }) {
    const pageNum = Math.max(1, parseInt(searchParams?.page || '1', 10));
    const category = searchParams?.category || null;

    const [{ nav, footer }, posts, categories] = await Promise.all([
        getSiteSettings('nav', 'footer'),
        db.select({
            id: pages.id,
            slug: pages.slug,
            title: pages.title,
            meta: pages.meta,
            featuredImage: pages.featuredImage,
            category: pages.category,
            publishedAt: pages.publishedAt,
        })
            .from(pages)
            .where(
                and(
                    eq(pages.type, 'blog_post'),
                    eq(pages.status, 'published'),
                    ...(category ? [eq(pages.category, category)] : []),
                )
            )
            .orderBy(desc(pages.publishedAt))
            .limit(PER_PAGE)
            .offset((pageNum - 1) * PER_PAGE),
        db.selectDistinct({ category: pages.category })
            .from(pages)
            .where(and(eq(pages.type, 'blog_post'), eq(pages.status, 'published')))
            .orderBy(pages.category),
    ]);

    const categoryList = categories.map(r => r.category).filter(Boolean);

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <BlogPageContent
                posts={posts}
                categories={categoryList}
                currentCategory={category}
                currentPage={pageNum}
            />
        </MarketingLayout>
    );
}

function BlogPageContent({ posts, categories, currentCategory, currentPage }) {
    return (
        <BlogClientContent
            posts={posts}
            categories={categories}
            currentCategory={currentCategory}
            currentPage={currentPage}
        />
    );
}

// Thin server→client bridge — client component handles interactivity
import BlogClientContent from './BlogClientContent';
