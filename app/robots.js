import { forumReaderOn } from '@/lib/forumConfig.mjs';

const SITE_SITEMAP = 'https://www.gymnasticbodies.com/sitemap.xml';
const FORUM_SITEMAP = 'https://www.gymnasticbodies.com/forum/sitemap.xml';

export default function robots() {
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin/', '/api/'],
            },
        ],
        // The forum sitemap is only advertised once the read-only reader is live.
        sitemap: forumReaderOn() ? [SITE_SITEMAP, FORUM_SITEMAP] : SITE_SITEMAP,
    };
}
