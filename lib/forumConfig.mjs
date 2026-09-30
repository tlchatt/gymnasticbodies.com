// Shared forum settings. Plain .mjs so next.config.mjs (which can't resolve '@/')
// and the app code read the SAME gate.

// CUTOVER SWITCH. false = production keeps proxying the legacy Invision forum on the
// old box; the Neon-backed read-only reader is only reachable in dev and on Vercel
// preview deploys. Flip to true to make the reader live in production.
export const FORUM_READER_LIVE = false;

export function forumReaderOn() {
    return FORUM_READER_LIVE
        || process.env.NODE_ENV !== 'production'
        || process.env.VERCEL_ENV === 'preview';
}

// Where post attachments / emoticons are served from. While this is a relative
// path the legacy box still serves them (via the proxy); once the uploads are
// mirrored to Blob, set this to the absolute Blob base and /forum/uploads/* 301s there.
export const FORUM_UPLOADS_BASE = '/forum/uploads';

// Dating/escort bot-spam topics — answered with 410 Gone.
export const FORUM_SPAM_TIDS = [37275, 37411, 37412, 37416];

// Invision served 25 topics per forum page and 25 posts per topic page, so
// /page/N URLs line up with the old forum.
export const FORUM_PER_PAGE = 25;

export const FORUM_SITE = 'https://www.gymnasticbodies.com';
