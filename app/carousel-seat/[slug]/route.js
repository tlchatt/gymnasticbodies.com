// Old WordPress `carousel-seat` custom-post-type URLs are intentionally gone.
// Return 410 Gone so search engines drop them cleanly (not a soft 404).
export function GET() {
    return new Response('Gone', { status: 410 });
}
