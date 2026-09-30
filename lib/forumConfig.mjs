// Shared forum settings. Plain .mjs so next.config.mjs (which can't resolve '@/')
// and the app code read the SAME gate.

// CUTOVER SWITCH. false = production proxies the legacy Invision forum on the old box
// and the Neon-backed read-only reader is only reachable in dev and on Vercel preview
// deploys. true = the reader is live in production (cut over 2026-09-30).
export const FORUM_READER_LIVE = true;

export function forumReaderOn() {
    return FORUM_READER_LIVE
        || process.env.NODE_ENV !== 'production'
        || process.env.VERCEL_ENV === 'preview';
}

// Where post attachments / emoticons are served from: the Vercel Blob mirror of the
// files public posts reference (claudePlans/forum-uploads-manifest-2026-09-30.json).
// /forum/uploads/* 301s here. Files referenced only by private forums were not mirrored.
export const FORUM_UPLOADS_BASE = 'https://6z1gtynqfxcjjwix.public.blob.vercel-storage.com/forum/uploads';

// Dating/escort bot-spam topics — answered with 410 Gone.
export const FORUM_SPAM_TIDS = [37275, 37411, 37412, 37416];

// Invision served 25 topics per forum page and 25 posts per topic page, so
// /page/N URLs line up with the old forum.
export const FORUM_PER_PAGE = 25;

export const FORUM_SITE = 'https://www.gymnasticbodies.com';
