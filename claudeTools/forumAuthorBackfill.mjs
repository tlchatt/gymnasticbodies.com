#!/usr/bin/env node
/* Forum author backfill: fill empty forum_posts.author_name in Neon from the frozen IPS dump.
 *
 * Usage (from app.gymnasticbodies.com/):
 *   node --env-file=.env.local claudeTools/forumAuthorBackfill.mjs            # dry run (default)
 *   node --env-file=.env.local claudeTools/forumAuthorBackfill.mjs --confirm  # write
 *   ... --cache=<file>   reuse/save the dump scan so a second run skips the 3.4 GB stream
 *
 * Name resolution for a post whose Neon author_name is NULL/'':
 *   1. the dump row's own forums_posts.author_name, if non-empty
 *   2. else core_members.name for forums_posts.author_id
 *   3. else 'Guest' (author_id 0, or the member row no longer exists — what IPS itself shows)
 * Never overwrites an existing name (the UPDATE re-checks emptiness). Writes the changed pids
 * to claudePlans/forum-author-backfill-2026-09-30.json so the run can be reversed. */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DUMP = path.resolve(HERE, '../../forum_backup_2026-07-24/goatfart_forum40.sql.gz');
const OUT = path.resolve(HERE, '../claudePlans/forum-author-backfill-2026-09-30.json');
const CONFIRM = process.argv.includes('--confirm');
const CACHE = (process.argv.find((a) => a.startsWith('--cache=')) || '').slice(8) || null;
const db = neon(process.env.DATABASE_URL);

// MySQL tuple parser (same logic as forumEtl.js): "(v1,'v2',...)," -> values, honoring quotes + escapes.
// `limit` stops early once that many leading fields are read (posts carry a big html field we can skip past).
function parseTuple(line, limit = Infinity) {
    let s = line.trim();
    if (s.endsWith(',')) s = s.slice(0, -1);
    if (s.endsWith(';')) s = s.slice(0, -1);
    if (s.startsWith('(')) s = s.slice(1);
    if (s.endsWith(')')) s = s.slice(0, -1);
    const out = [];
    let i = 0, cur = '', inStr = false, val = null;
    while (i < s.length) {
        const c = s[i];
        if (inStr) {
            if (c === '\\') {
                const n = s[i + 1];
                cur += ({ n: '\n', r: '\r', t: '\t', '0': '\0', "'": "'", '"': '"', '\\': '\\', b: '\b', Z: '\x1a' }[n]) ?? n;
                i += 2; continue;
            }
            if (c === "'") { inStr = false; val = cur; i++; continue; }
            cur += c; i++; continue;
        }
        if (c === "'") { inStr = true; cur = ''; i++; continue; }
        if (c === ',') { out.push(val); if (out.length >= limit) return out; val = null; cur = ''; i++; continue; }
        let tok = '';
        while (i < s.length && s[i] !== ',') { tok += s[i]; i++; }
        tok = tok.trim();
        val = (tok === 'NULL' || tok === '') ? null : tok;
    }
    out.push(val);
    return out;
}

// One pass over the dump: forums_posts (pid, author_id, author_name, queued) + core_members (member_id, name).
// Column positions verified against the dump's CREATE TABLE statements:
//   forums_posts: 0 pid, 3 author_id, 4 author_name, 8 queued     core_members: 0 member_id, 1 name
async function scanDump() {
    if (CACHE && fs.existsSync(CACHE)) {
        const j = JSON.parse(fs.readFileSync(CACHE, 'utf8'));
        console.log(`scan: loaded cache ${CACHE} (${j.posts.length} posts, ${j.members.length} members)`);
        return { posts: new Map(j.posts), members: new Map(j.members) };
    }
    const posts = new Map();   // pid -> [author_id, author_name, queued]
    const members = new Map(); // member_id -> name
    const z = spawn('zcat', [DUMP], { stdio: ['ignore', 'pipe', 'inherit'] });
    const rl = readline.createInterface({ input: z.stdout, crlfDelay: Infinity });
    let table = null;
    for await (const line of rl) {
        if (line.startsWith('INSERT INTO `')) {
            const t = line.slice(13, line.indexOf('`', 13));
            table = (t === 'forums_posts' || t === 'core_members') ? t : null;
            continue;
        }
        if (!table) continue;
        if (line[0] !== '(') { table = null; continue; }
        if (table === 'core_members') {
            const v = parseTuple(line, 2);
            if (Number(v[0])) members.set(Number(v[0]), v[1] || '');
        } else {
            const v = parseTuple(line, 9);
            if (Number(v[0])) posts.set(Number(v[0]), [Number(v[3]) || 0, v[4] || '', Number(v[8]) || 0]);
        }
    }
    console.log(`scan: ${posts.size} forums_posts rows, ${members.size} core_members rows`);
    if (CACHE) fs.writeFileSync(CACHE, JSON.stringify({ posts: [...posts], members: [...members] }));
    return { posts, members };
}

const { posts, members } = await scanDump();

const missing = await db.query(`SELECT pid, author_name IS NULL AS was_null FROM forum_posts WHERE author_name IS NULL OR author_name = '' ORDER BY pid`);
console.log(`neon: ${missing.length} posts with empty author_name`);

const buckets = { post_author_name: [], member_name: [], guest_author_id_0: [], guest_member_deleted: [], not_in_dump: [], member_name_blank: [] };
const resolved = []; // [pid, name]
for (const { pid } of missing) {
    const p = posts.get(pid);
    if (!p) { buckets.not_in_dump.push(pid); continue; }
    const [authorId, postName] = p;
    if (postName.trim()) { buckets.post_author_name.push(pid); resolved.push([pid, postName]); continue; }
    if (!authorId) { buckets.guest_author_id_0.push(pid); resolved.push([pid, 'Guest']); continue; }
    if (!members.has(authorId)) { buckets.guest_member_deleted.push(pid); resolved.push([pid, 'Guest']); continue; }
    const name = members.get(authorId);
    if (!name.trim()) { buckets.member_name_blank.push(pid); resolved.push([pid, 'Guest']); continue; }
    buckets.member_name.push(pid); resolved.push([pid, name]);
}
const counts = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length]));
console.log('buckets:', counts);
console.log('sample resolutions:', resolved.filter(([, n]) => n !== 'Guest').slice(0, 5), resolved.filter(([, n]) => n === 'Guest').slice(0, 3));

// Side observation for the reader build: the ETL did not carry forums_posts.queued (0 visible, 1 unapproved, -1 hidden, 2+ deleted).
const all = await db.query(`SELECT pid FROM forum_posts`);
const queued = {};
for (const { pid } of all) { const q = posts.get(pid)?.[2]; const k = q === undefined ? 'not_in_dump' : String(q); queued[k] = (queued[k] || 0) + 1; }
console.log('queued distribution of the posts loaded in Neon:', queued);

if (!CONFIRM) { console.log('\nDRY RUN — nothing written. Re-run with --confirm to apply.'); process.exit(0); }

const wasNull = new Set(missing.filter((m) => m.was_null).map((m) => m.pid));
const changed = [];
for (let i = 0; i < resolved.length; i += 5000) {
    const chunk = resolved.slice(i, i + 5000);
    const rows = await db.query(
        `UPDATE forum_posts p SET author_name = v.name
           FROM (SELECT unnest($1::int[]) AS pid, unnest($2::text[]) AS name) v
          WHERE p.pid = v.pid AND (p.author_name IS NULL OR p.author_name = '')
      RETURNING p.pid`,
        [chunk.map((r) => r[0]), chunk.map((r) => r[1])]
    );
    changed.push(...rows.map((r) => r.pid));
    console.log(`  updated ${changed.length}/${resolved.length}`);
}
const changedSet = new Set(changed);
fs.writeFileSync(OUT, JSON.stringify({
    ranAt: new Date().toISOString(),
    source: 'forum_backup_2026-07-24/goatfart_forum40.sql.gz (forums_posts.author_id -> core_members.name)',
    reverse: "UPDATE forum_posts SET author_name = NULL WHERE pid = ANY(<changedPids>) -- every changed row was NULL or '' before; previousEmptyString lists the '' ones",
    emptyBefore: missing.length,
    updated: changed.length,
    bucketCounts: counts,
    queuedDistributionInNeon: queued,
    previousEmptyString: changed.filter((pid) => !wasNull.has(pid)),
    buckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.filter((pid) => changedSet.has(pid) || k === 'not_in_dump')])),
}));
const [{ n }] = await db.query(`SELECT count(*)::int n FROM forum_posts WHERE author_name IS NULL OR author_name = ''`);
console.log(`done: ${changed.length} rows updated; ${n} still empty; record -> ${OUT}`);
