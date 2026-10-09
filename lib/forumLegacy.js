import phpbbLinks from '@/data/forum/phpbbLinks.json';
import attachmentFiles from '@/data/forum/attachmentFiles.json';
import { FORUM_UPLOADS_BASE } from '@/lib/forumConfig.mjs';

// Links from before the reader that still appear in posts and in backlinks:
//   viewtopic.php?t=N / ?p=N  — the phpBB forum the site ran before Invision (2013).
//     data/forum/phpbbLinks.json, from the Invision converter's link tables
//     (claudeTools/forumPhpbbLinks.mjs).
//   attachment.php?id=N       — an Invision attachment that was not an inline image.
//     data/forum/attachmentFiles.json, attachment ids whose file is on the Blob mirror
//     (claudeTools/forumUploads.mjs refs).
// Both take the raw query string (entities may still be encoded) and return null when
// the id is unknown.

function queryParam(query, key) {
    const m = (query || '').replace(/&amp;/g, '&').match(new RegExp(`(?:^|[?&])${key}=(\\d{1,9})(?:&|#|$)`));
    return m ? m[1] : null;
}

// -> the Invision topic id a phpBB link points at.
export function phpbbTopicId(query) {
    const t = queryParam(query, 't');
    if (t) return phpbbLinks.topics[t] ?? null;
    const p = queryParam(query, 'p');
    if (p) return phpbbLinks.posts[p] ?? null;
    return null;
}

// -> the Blob URL of an attachment.php?id=N file.
export function attachmentUrl(query) {
    const id = queryParam(query, 'id');
    const file = id && attachmentFiles[id];
    return file ? `${FORUM_UPLOADS_BASE}/${file.split('/').map(encodeURIComponent).join('/')}` : null;
}
