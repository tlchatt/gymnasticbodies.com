// Old phpBB forum links -> Invision topic ids, for the read-only forum reader.
//
// Before Invision (2013) the forum ran phpBB, and posts still link to it as
// viewtopic.php?t=N / ?p=N. The Invision converter kept the id mapping in the dump's
// convert_link_topics / convert_link_posts tables (app 1 = phpbb). This writes
// data/forum/phpbbLinks.json:
//   topics: { phpbbTopicId: tid }   every converted topic (outside backlinks can use any of them)
//   posts:  { phpbbPostId: tid }    only the post ids that posts in Neon actually link to
//
//   node --env-file=.env.local claudeTools/forumPhpbbLinks.mjs <convert_link_topics.sql> <convert_link_posts.sql>
//
// The two inputs are the INSERT statements for those tables, cut out of
// forum_backup_2026-07-24/goatfart_forum40.sql.gz with
//   zcat … | sed -n '/^INSERT INTO `convert_link_topics`/,/;$/p'

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../data/forum/phpbbLinks.json');

// (link_id, ipb_id, 'foreign_id', 'type', duplicate, app)
function readLinks(file) {
    const map = new Map();
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/\((\d+),(\d+),'(\d+)','[a-z]+',(\d+),1\)/g)) {
        map.set(parseInt(m[3], 10), parseInt(m[2], 10));
    }
    return map;
}

const [topicsFile, postsFile] = process.argv.slice(2);
if (!topicsFile || !postsFile) {
    console.error('usage: forumPhpbbLinks.mjs <convert_link_topics.sql> <convert_link_posts.sql>');
    process.exit(1);
}

const topicLinks = readLinks(topicsFile);
const postLinks = readLinks(postsFile);
const sql = neon(process.env.DATABASE_URL);

// Every viewtopic.php query string in a post.
const rows = await sql.query(`
    SELECT (regexp_matches(html, 'viewtopic\\.php\\?([^"''<\\s#]*)', 'g'))[1] AS qs
    FROM forum_posts WHERE html LIKE '%viewtopic.php%'`);

const wantedPosts = new Set();
let withTopic = 0, withPostOnly = 0, other = 0;
for (const { qs } of rows) {
    const q = qs.replace(/&amp;/g, '&');
    const t = q.match(/(?:^|&)t=(\d+)/);
    const p = q.match(/(?:^|&)p=(\d+)/);
    if (t) withTopic++;
    else if (p) { withPostOnly++; wantedPosts.add(parseInt(p[1], 10)); }
    else other++;
}

// phpBB post id -> Invision pid -> its topic.
const pids = [...wantedPosts].map((p) => postLinks.get(p)).filter(Boolean);
const pidTopic = new Map();
if (pids.length) {
    for (const r of await sql.query('SELECT pid, tid FROM forum_posts WHERE pid = ANY($1)', [pids])) pidTopic.set(r.pid, r.tid);
}

const posts = {};
for (const p of [...wantedPosts].sort((a, b) => a - b)) {
    const tid = pidTopic.get(postLinks.get(p));
    if (tid) posts[p] = tid;
}
const topics = Object.fromEntries([...topicLinks.entries()].sort((a, b) => a[0] - b[0]));

fs.writeFileSync(OUT, JSON.stringify({ topics, posts }) + '\n');

console.log('converted topics      :', topicLinks.size, '| converted posts:', postLinks.size);
console.log('viewtopic links       :', rows.length, `(t= ${withTopic}, p= only ${withPostOnly}, neither ${other})`);
console.log('p= ids resolved       :', Object.keys(posts).length, 'of', wantedPosts.size);
console.log('->', OUT);
