#!/usr/bin/env node
/* Forum hidden-post report (READ-ONLY — no database writes).
 * The ETL did not carry forums_posts.queued, so non-visible posts sit in Neon forum_posts as if public.
 * This lists every loaded pid with queued != 0 and (with --verify) checks the flag's meaning against
 * the live forum as a logged-out visitor.
 *
 * Usage (from app.gymnasticbodies.com/):
 *   node --env-file=.env.local claudeTools/forumHiddenPosts.mjs            # write the json
 *   node --env-file=.env.local claudeTools/forumHiddenPosts.mjs --verify   # + live hit/miss table
 */
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DUMP = path.resolve(HERE, '../../forum_backup_2026-07-24/goatfart_forum40.sql.gz');
const OUT = path.resolve(HERE, '../claudePlans/forum-hidden-posts-2026-09-30.json');
const VERIFY = process.argv.includes('--verify');
const GUEST_FORUMS = new Set([17, 19, 20, 22, 24, 26, 27, 16]);
const PER_PAGE = 25;
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const db = neon(process.env.DATABASE_URL);

function parseTuple(line) {
    let s = line.trim();
    if (s.endsWith(',')) s = s.slice(0, -1);
    if (s.endsWith(';')) s = s.slice(0, -1);
    if (s.startsWith('(')) s = s.slice(1);
    if (s.endsWith(')')) s = s.slice(0, -1);
    const out = [];
    let i = 0, inStr = false, val = null, start = 0;
    while (i < s.length) {
        const c = s[i];
        if (inStr) {
            if (c === '\\') { i += 2; continue; }
            if (c === "'") { inStr = false; val = s.slice(start, i); i++; continue; }
            i++; continue;
        }
        if (c === "'") { inStr = true; start = i + 1; i++; continue; }
        if (c === ',') { out.push(val); val = null; i++; continue; }
        let j = i; while (j < s.length && s[j] !== ',') j++;
        const tok = s.slice(i, j).trim(); i = j;
        val = (tok === 'NULL' || tok === '') ? null : tok;
    }
    out.push(val);
    return out;
}

// forums_posts columns (from the dump's CREATE TABLE): 0 pid, 6 post_date, 8 queued, 9 topic_id, 16 pdelete_time
const posts = new Map(); // pid -> [queued, tid, post_date, pdelete_time]
{
    const z = spawn('zcat', [DUMP], { stdio: ['ignore', 'pipe', 'inherit'] });
    const rl = readline.createInterface({ input: z.stdout, crlfDelay: Infinity });
    let on = false;
    for await (const line of rl) {
        if (line.startsWith('INSERT INTO `')) { on = line.startsWith('INSERT INTO `forums_posts`'); continue; }
        if (!on) continue;
        if (line[0] !== '(') { on = false; continue; }
        const v = parseTuple(line);
        if (v.length !== 22) throw new Error(`forums_posts tuple has ${v.length} fields, expected 22 (pid ${v[0]})`);
        posts.set(Number(v[0]), [Number(v[8]) || 0, Number(v[9]) || 0, Number(v[6]) || 0, Number(v[16]) || 0]);
    }
}
console.log(`dump: ${posts.size} forums_posts rows`);

const topics = new Map((await db.query(`SELECT tid, forum_id, seo_slug, approved, spam FROM forum_topics`)).map((t) => [t.tid, t]));
const loaded = (await db.query(`SELECT pid, tid FROM forum_posts`));

const groups = {}; // queued -> [{pid, tid, forum_id}]
const counts = {}; // queued -> {total, guestVisibleForum, guestVisibleForumAndPublicTopic, otherForum, topicNotLoaded}
const pdel = { queued0_with_pdelete: 0, queued0_pids: [], nonzero_by_queued: {} };
for (const { pid, tid } of loaded) {
    const p = posts.get(pid);
    if (!p) continue;
    const [queued, , , pdelete] = p;
    if (pdelete) { pdel.nonzero_by_queued[queued] = (pdel.nonzero_by_queued[queued] || 0) + 1; if (queued === 0) { pdel.queued0_with_pdelete++; const t0 = topics.get(tid); pdel.queued0_pids.push({ pid, tid, forum_id: t0?.forum_id ?? null, topicApproved: t0?.approved ?? null }); } }
    if (queued === 0) continue;
    const t = topics.get(tid);
    const c = (counts[queued] ||= { total: 0, guestVisibleForum: 0, guestVisibleForumAndPublicTopic: 0, otherForum: 0, topicNotLoaded: 0 });
    c.total++;
    if (!t) c.topicNotLoaded++;
    else if (GUEST_FORUMS.has(t.forum_id)) { c.guestVisibleForum++; if (t.approved === 1 && !t.spam) c.guestVisibleForumAndPublicTopic++; }
    else c.otherForum++;
    (groups[queued] ||= []).push({ pid, tid, forum_id: t?.forum_id ?? null });
}
for (const g of Object.values(groups)) g.sort((a, b) => a.pid - b.pid);
console.log('counts by queued:', counts);
console.log('pdelete_time among loaded posts:', pdel);

const result = {
    generatedAt: new Date().toISOString(),
    source: 'forum_backup_2026-07-24/goatfart_forum40.sql.gz forums_posts.queued',
    unverifiable: 'queued=2 (all in approved=-1 topics) and queued=1 (all 4 in non-guest forums) cannot be checked as a logged-out visitor: their topics are not guest-readable, so the reader filter approved=1 already excludes every queued=2 post.',
    note: 'READ-ONLY report. guestVisibleForumAndPublicTopic = posts the reader would have displayed (guest-visible forum, topic approved=1 AND NOT spam).',
    guestVisibleForums: [...GUEST_FORUMS],
    counts, pdeleteTime: pdel, verification: null, posts: groups,
};

if (VERIFY) {
    const get = async (url) => { const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' }); return { status: r.status, html: r.status === 200 ? await r.text() : '' }; };
    const byTopic = new Map(); // tid -> sorted [pid, queued, post_date]
    for (const { pid, tid } of loaded) { const p = posts.get(pid); if (p) (byTopic.get(tid) || byTopic.set(tid, []).get(tid)).push([pid, p[0], p[2]]); }
    for (const a of byTopic.values()) a.sort((x, y) => x[2] - y[2] || x[0] - y[0]);
    // the page a post sits on (or would sit on) for a guest, who sees only queued=0 posts, 25 a page
    const pageOf = (tid, pid) => { let n = 0; for (const [p, q] of byTopic.get(tid)) { if (p === pid) break; if (q === 0) n++; } return Math.floor(n / PER_PAGE) + 1; };
    const present = (html, pid) => html.includes(`elComment_${pid}"`) || html.includes(`comment-${pid}"`) || html.includes(`data-commentid="${pid}"`);
    const cache = new Map();
    const check = async (pid, tid, queued) => {
        const t = topics.get(tid), page = pageOf(tid, pid);
        const tried = [];
        let hit = false, status = null;
        for (const pg of [page, page - 1, page + 1]) {
            if (pg < 1) continue;
            const url = `https://www.gymnasticbodies.com/forum/topic/${tid}-${t.seo_slug}` + (pg > 1 ? `/page/${pg}` : '');
            if (!cache.has(url)) cache.set(url, await get(url));
            const r = cache.get(url); status ??= r.status; tried.push(`${pg}:${r.status}`);
            if (present(r.html, pid)) { hit = true; break; }
            if (queued === 0 && pg === page && r.status !== 200) break;
        }
        return { pid, tid, forum_id: t.forum_id, queued, expectedPage: page, pagesTried: tried, present: hit };
    };
    const eligible = (o) => { const t = topics.get(o.tid); return t && GUEST_FORUMS.has(t.forum_id) && t.approved === 1 && !t.spam; };
    const spread = (arr, n) => { const e = arr.filter(eligible); const step = Math.max(1, Math.floor(e.length / n)); const seen = new Set(), out = []; for (let i = 0; i < e.length && out.length < n; i += step) { if (!seen.has(e[i].tid)) { seen.add(e[i].tid); out.push(e[i]); } } return out; };
    const table = [];
    const sampleTids = new Set();
    for (const q of [-1, 2, 1]) {
        for (const o of spread(groups[q] || [], q === 1 ? 4 : 5)) { table.push(await check(o.pid, o.tid, q)); sampleTids.add(o.tid); }
    }
    // control: a visible (queued=0) post from the same topics, ideally the one right next to the hidden post
    let controls = 0;
    for (const row of [...table]) {
        if (controls >= 5) break;
        const arr = byTopic.get(row.tid); const i = arr.findIndex((x) => x[0] === row.pid);
        const near = [arr[i + 1], arr[i - 1], arr[i + 2], arr[i - 2]].find((x) => x && x[1] === 0);
        if (!near) continue;
        table.push(await check(near[0], row.tid, 0)); controls++;
    }
    for (const r of table) console.log(`queued ${String(r.queued).padStart(2)} | pid ${r.pid} | tid ${r.tid} (forum ${r.forum_id}) | expected page ${r.expectedPage} | tried ${r.pagesTried.join(',')} | ${r.present ? 'PRESENT' : 'absent'}`);
    const summary = {};
    for (const r of table) { const s = (summary[r.queued] ||= { checked: 0, present: 0, absent: 0 }); s.checked++; r.present ? s.present++ : s.absent++; }
    console.log('summary:', summary);
    result.verification = { method: 'logged-out fetch of the live topic page (browser UA, no trailing slash, /page/N at 25 visible posts per page, plus the adjacent pages); present = the comment element id for that pid is in the HTML', summary, table };
}

fs.writeFileSync(OUT, JSON.stringify(result));
console.log(`written -> ${OUT}`);
