import { db } from '@/Drizzle';
import { pages } from '@/Drizzle/db/schema';
import { eq } from 'drizzle-orm';

const BASE = 'https://www.gymnasticbodies.com';

const STATIC_ROUTES = [
    { url: `${BASE}/`, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${BASE}/subscribe/`, priority: 0.9, changeFrequency: 'monthly' },
    { url: `${BASE}/all-access/`, priority: 0.8, changeFrequency: 'monthly' },
    { url: `${BASE}/hey-newbies/`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${BASE}/think-stronger/`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${BASE}/mobility/`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${BASE}/body-weight/`, priority: 0.7, changeFrequency: 'monthly' },
    { url: `${BASE}/free-members/`, priority: 0.6, changeFrequency: 'monthly' },
    { url: `${BASE}/blog/`, priority: 0.6, changeFrequency: 'weekly' },
];

export default async function sitemap() {
    const posts = await db
        .select({ slug: pages.slug, updatedAt: pages.updatedAt })
        .from(pages)
        .where(eq(pages.type, 'blog_post'));

    const blogEntries = posts.map(post => ({
        url: `${BASE}/${post.slug}/`,
        lastModified: post.updatedAt ?? new Date(),
        changeFrequency: 'yearly',
        priority: 0.5,
    }));

    return [...STATIC_ROUTES, ...blogEntries];
}
