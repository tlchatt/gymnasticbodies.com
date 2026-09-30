// The dating/escort bot-spam topics (FORUM_SPAM_TIDS in lib/forumConfig.mjs) are
// rewritten here by next.config.mjs. 410 Gone so search engines drop them cleanly.
function gone() {
    return new Response('Gone', { status: 410 });
}

export { gone as GET, gone as HEAD };
