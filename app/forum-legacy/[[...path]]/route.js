import { forumProxy } from '@/lib/forumProxy';

// Legacy Invision forum, reverse-proxied. While the read-only reader is NOT live in
// production, next.config.mjs rewrites /forum, /forum/forum/*, /forum/topic/* and
// /forum/sitemap.xml here so those URLs keep serving the old forum. The origin path
// is still /forum/... (see lib/forumProxy.js).

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export {
    forumProxy as GET,
    forumProxy as POST,
    forumProxy as PUT,
    forumProxy as DELETE,
    forumProxy as PATCH,
    forumProxy as HEAD,
    forumProxy as OPTIONS,
};
