// Invision's ?page=N form of a forum or topic URL, rewritten here by next.config.mjs.
// 301 to the reader's /page/N URL with the query string dropped; the page itself then
// corrects the slug or an out-of-range page number.
function paged(_request, { params }) {
    return params.then(({ kind, slug, n }) => {
        const page = parseInt(n, 10);
        const base = `/forum/${kind === 'forum' ? 'forum' : 'topic'}/${slug}`;
        return new Response(null, {
            status: 301,
            headers: { Location: encodeURI(page > 1 ? `${base}/page/${page}` : base) },
        });
    });
}

export { paged as GET, paged as HEAD };
