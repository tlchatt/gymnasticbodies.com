import sanitizeHtml from 'sanitize-html';
import { FORUM_UPLOADS_BASE } from '@/lib/forumConfig.mjs';
import { phpbbTopicId, attachmentUrl } from '@/lib/forumLegacy';

// Invision post bodies -> safe HTML for the read-only reader.
//
// Post HTML is nested markup, so it can't take React inline styles. Source `style`
// and `class` attributes are all dropped (the old forum was a light theme — inline
// colours like #000000 would be invisible here) and our own token-based inline
// styles are injected per tag during the sanitize pass instead.

const IFRAME_HOSTS = ['www.youtube.com', 'youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'];

const STYLES = {
    p: 'margin:0 0 1em',
    a: 'color:var(--accent-light);text-decoration:underline;overflow-wrap:anywhere',
    blockquote: 'margin:0 0 1em;padding:0.75rem 1rem;border-left:3px solid var(--accent);background:var(--bg-raised);border-radius:var(--radius-sm)',
    citation: 'margin:0 0 0.5rem;font-size:0.875rem;font-weight:500;color:var(--text)',
    img: 'max-width:100%;height:auto;border-radius:var(--radius-sm)',
    emoticon: 'display:inline;vertical-align:middle',
    ul: 'margin:0 0 1em;padding-left:1.5rem;list-style:disc',
    ol: 'margin:0 0 1em;padding-left:1.5rem;list-style:decimal',
    li: 'margin:0 0 0.25em',
    pre: 'margin:0 0 1em;padding:1rem;background:var(--bg-base);border-radius:var(--radius-md);overflow:auto;font-size:0.875rem',
    code: 'font-family:var(--font-geist-mono),monospace',
    heading: 'margin:0 0 0.5em;font-size:1.125rem;font-weight:500;color:var(--text)',
    strong: 'font-weight:500;color:var(--text)',
    table: 'margin:0 0 1em;border-collapse:collapse;display:block;overflow-x:auto;max-width:100%',
    cell: 'border:1px solid var(--border-default);padding:0.4rem 0.6rem;text-align:left',
    hr: 'border:0;border-top:1px solid var(--border-default);margin:1em 0',
    iframe: 'display:block;width:100%;max-width:640px;aspect-ratio:16/9;height:auto;border:0;border-radius:var(--radius-md);margin:0 0 1em',
};

const FORUM_HOST_RE = /^(?:https?:)?\/\/(?:www\.)?gymnasticbodies\.com(\/forum(?:[/?#].*)?)$/i;

// Map a link found in a post to where it should point in the read-only reader.
// Returns { href } for a live destination, { external: href } for an outside link,
// or null when the target is a dead endpoint (profiles, search, a phpBB topic or an
// attachment we have no file for, etc.) and the link should be unwrapped to plain text.
export function rewriteForumHref(raw) {
    const href = (raw || '').trim();
    if (!href) return null;
    if (href.startsWith(FORUM_UPLOADS_BASE + '/')) return { href };

    let path = null;
    const abs = href.match(FORUM_HOST_RE);
    if (abs) path = abs[1];
    else if (/^\/forum(?:[/?#]|$)/.test(href)) path = href;
    // Relative phpBB links ("viewtopic.php?t=61", "./viewtopic.php?…").
    else if (/^(?:\.\/)?viewtopic\.php\?/i.test(href)) path = `/forum/${href.replace(/^\.\//, '')}`;

    if (path === null) {
        return /^(?:https?:|mailto:)/i.test(href) ? { external: href } : null;
    }

    const upload = path.match(/^\/forum\/uploads\/(.+)$/);
    if (upload) return { href: `${FORUM_UPLOADS_BASE}/${upload[1]}` };

    const phpbb = path.match(/\/viewtopic\.php\?(.*)$/i);
    if (phpbb) {
        const tid = phpbbTopicId(phpbb[1]);
        return tid ? { href: `/forum/topic/${tid}-topic` } : null;
    }
    const attachment = path.match(/\/attachment\.php\?(.*)$/i);
    if (attachment) {
        const url = attachmentUrl(attachment[1]);
        return url ? { href: url } : null;
    }

    const topic = path.match(/\/topic\/(\d+)-([^/?#&]*)/);
    if (topic) {
        const page = path.match(/(?:\/page\/|[?&]page=)(\d+)/);
        const n = page ? parseInt(page[1], 10) : 1;
        return { href: `/forum/topic/${topic[1]}-${topic[2]}${n > 1 ? `/page/${n}` : ''}` };
    }
    const showTopic = path.match(/[?&]showtopic=(\d+)/);
    if (showTopic) return { href: `/forum/topic/${showTopic[1]}-topic` };

    const forum = path.match(/\/forum\/(?:index\.php\?\/)?forum\/(\d+)-([^/?#&]*)/);
    if (forum) return { href: `/forum/forum/${forum[1]}-${forum[2]}` };
    const showForum = path.match(/[?&]showforum=(\d+)/);
    if (showForum) return { href: `/forum/forum/${showForum[1]}-forum` };

    if (/^\/forum\/?(?:index\.php)?\/?$/.test(path)) return { href: '/forum' };
    return null;
}

function styled(tagName, style) {
    return (_tag, attribs) => {
        const next = { ...attribs };
        delete next.class;
        if (style) next.style = style; else delete next.style;
        return { tagName, attribs: next };
    };
}

// Old posts carry formatting as inline styles on spans — keep the meaning, drop the style.
function spanTransform(_tag, attribs) {
    const s = (attribs.style || '').replace(/\s/g, '').toLowerCase();
    if (s.includes('text-decoration:underline')) return { tagName: 'u', attribs: {} };
    if (s.includes('text-decoration:line-through')) return { tagName: 's', attribs: {} };
    if (s.includes('font-weight:bold') || s.includes('font-weight:700')) return { tagName: 'strong', attribs: { style: STYLES.strong } };
    if (s.includes('font-style:italic')) return { tagName: 'em', attribs: {} };
    return { tagName: 'span', attribs: {} };
}

function divTransform(_tag, attribs) {
    const isCitation = /\bipsQuote_citation\b/.test(attribs.class || '');
    return { tagName: 'div', attribs: isCitation ? { style: STYLES.citation } : {} };
}

function linkTransform(_tag, attribs) {
    const target = rewriteForumHref(attribs.href);
    if (!target) return { tagName: 'span', attribs: {} };
    if (target.external) {
        return { tagName: 'a', attribs: { href: target.external, rel: 'nofollow ugc noopener', style: STYLES.a } };
    }
    return { tagName: 'a', attribs: { href: target.href, style: STYLES.a } };
}

function imgTransform(_tag, attribs) {
    const isEmoticon = attribs['data-emoticon'] !== undefined || /\/emoticons\//.test(attribs.src || '');
    const next = {
        src: attribs.src,
        alt: attribs.alt || '',
        loading: 'lazy',
        decoding: 'async',
        style: isEmoticon ? STYLES.emoticon : STYLES.img,
    };
    if (isEmoticon && attribs.height) next.height = attribs.height;
    if (isEmoticon && attribs.width) next.width = attribs.width;
    return { tagName: 'img', attribs: next };
}

function iframeTransform(_tag, attribs) {
    const src = (attribs.src || '').replace(/^\/\//, 'https://');
    // Invision's own "embedded topic" iframes have no backend any more — turn into a link.
    const internal = rewriteForumHref(src);
    if (internal?.href && internal.href.startsWith('/forum/topic/')) {
        return { tagName: 'a', attribs: { href: internal.href, style: STYLES.a }, text: internal.href };
    }
    return {
        tagName: 'iframe',
        attribs: { src, loading: 'lazy', allowfullscreen: 'true', style: STYLES.iframe },
    };
}

const OPTIONS = {
    allowedTags: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'sub', 'sup', 'a', 'img',
        'blockquote', 'div', 'span', 'ul', 'ol', 'li', 'pre', 'code', 'h3', 'h4', 'h5', 'h6',
        'table', 'thead', 'tbody', 'tr', 'td', 'th', 'hr', 'iframe',
    ],
    allowedAttributes: {
        '*': ['style'],
        a: ['href', 'rel', 'style'],
        img: ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'style'],
        iframe: ['src', 'loading', 'allowfullscreen', 'style'],
        td: ['colspan', 'rowspan', 'style'],
        th: ['colspan', 'rowspan', 'style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https'], iframe: ['https'] },
    allowProtocolRelative: false,
    allowedIframeHostnames: IFRAME_HOSTS,
    // Every `style` that survives is one we set in a transform below.
    parseStyleAttributes: false,
    transformTags: {
        p: styled('p', STYLES.p),
        a: linkTransform,
        img: imgTransform,
        iframe: iframeTransform,
        span: spanTransform,
        div: divTransform,
        font: spanTransform,
        blockquote: styled('blockquote', STYLES.blockquote),
        ul: styled('ul', STYLES.ul),
        ol: styled('ol', STYLES.ol),
        li: styled('li', STYLES.li),
        pre: styled('pre', STYLES.pre),
        code: styled('code', STYLES.code),
        // Post headings sit under the page's own h1/h2.
        h1: styled('h3', STYLES.heading),
        h2: styled('h3', STYLES.heading),
        h3: styled('h3', STYLES.heading),
        h4: styled('h4', STYLES.heading),
        h5: styled('h5', STYLES.heading),
        h6: styled('h6', STYLES.heading),
        strong: styled('strong', STYLES.strong),
        b: styled('strong', STYLES.strong),
        em: styled('em'), i: styled('em'), u: styled('u'), s: styled('s'), strike: styled('s'), del: styled('del'),
        sub: styled('sub'), sup: styled('sup'), br: styled('br'),
        table: styled('table', STYLES.table),
        thead: styled('thead'), tbody: styled('tbody'), tr: styled('tr'),
        td: styled('td', STYLES.cell),
        th: styled('th', STYLES.cell),
        hr: styled('hr', STYLES.hr),
    },
    // A blocked iframe keeps its tag but loses its src — drop it; same for src-less images.
    exclusiveFilter: (frame) =>
        (frame.tag === 'iframe' && !frame.attribs.src) || (frame.tag === 'img' && !frame.attribs.src),
};

function readAttr(attrs, name) {
    const m = attrs.match(new RegExp(`\\s${name}="([^"]*)"`));
    return m ? m[1] : '';
}

// Resolve Invision's storage placeholders and absolute upload URLs to FORUM_UPLOADS_BASE.
function resolvePlaceholders(html) {
    return html
        .replaceAll('<fileStore.core_Attachment>', FORUM_UPLOADS_BASE)
        .replaceAll('<fileStore.core_Emoticons>', FORUM_UPLOADS_BASE)
        .replaceAll('<___base_url___>/uploads', FORUM_UPLOADS_BASE)
        .replaceAll('<___base_url___>', '/forum')
        .replace(/https?:\/\/(?:www\.)?gymnasticbodies\.com\/forum\/uploads\//gi, `${FORUM_UPLOADS_BASE}/`);
}

// Invision renders "X said:" above a quote client-side, so older stored quotes
// have no citation element — add one from the quote's username attribute.
function addQuoteCitations(html, saidLabel) {
    return html.replace(/<blockquote\b([^>]*)>/g, (tag, attrs, offset, whole) => {
        const after = whole.slice(offset + tag.length, offset + tag.length + 200).trimStart();
        if (/^<div[^>]*ipsQuote_citation/.test(after)) return tag;
        const name = readAttr(attrs, 'data-ipsquote-username') || readAttr(attrs, 'data-cite') || readAttr(attrs, 'data-author');
        if (!name) return tag;
        return `${tag}<div class="ipsQuote_citation">${name} ${saidLabel}</div>`;
    });
}

export function renderPostHtml(html, saidLabel = 'said:') {
    if (!html) return '';
    return sanitizeHtml(addQuoteCitations(resolvePlaceholders(html), saidLabel), OPTIONS);
}

// Plain-text excerpt of a post (quotes excluded) for the meta description.
export function postExcerpt(html, max = 155) {
    if (!html) return '';
    const text = sanitizeHtml(resolvePlaceholders(html), {
        allowedTags: [],
        allowedAttributes: {},
        nonTextTags: ['blockquote', 'script', 'style', 'textarea', 'option', 'noscript'],
    })
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}
