// Forum uploads -> Vercel Blob (forum read-only archive, Phase 4).
//
// The Invision forum keeps every uploaded file under {forum}/uploads on the old box. IPS
// stores them through one "FileSystem" storage whose URL is {board_url}/uploads, so BOTH
// <fileStore.core_Attachment>/X and <fileStore.core_Emoticons>/X resolve to /forum/uploads/X.
//
// Only files referenced by posts the public reader serves are published. Everything else
// (member form-check media, admin forums, avatars, theme files) stays in the local backup.
//
//   node --env-file=.env.local claudeTools/forumUploads.mjs refs      # scan Neon -> refs json
//   node --env-file=.env.local claudeTools/forumUploads.mjs upload    # put referenced files (resumable)
//   node --env-file=.env.local claudeTools/forumUploads.mjs verify    # HEAD every uploaded url
//
// Inputs (outside the repo, next to the forum DB dump):
//   forum_backup_2026-07-24/uploads-box-filelist.tsv   size \t relative path, from the box
//   forum_backup_2026-07-24/core_attachments.jsonl     attach id -> location (for attachment.php?id=N links)
//   forum_backup_2026-07-24/uploads/                   extracted copy of the box's uploads tree

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { neon } from '@neondatabase/serverless';
import { put, head } from '@vercel/blob';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKUP = path.resolve(HERE, '../../forum_backup_2026-07-24');
const LOCAL_UPLOADS = path.join(BACKUP, 'uploads');
const WORK = path.join(BACKUP, 'uploads-work');
const REFS_FILE = path.join(WORK, 'refs.json');
const LEDGER = path.join(WORK, 'upload-ledger.jsonl');
const BLOB_PREFIX = 'forum/uploads/';

// Forums a guest can read on the live forum (probed 2026-09-30).
const PUBLIC_FORUMS = [16, 17, 19, 20, 22, 24, 26, 27];

const MIME = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon', tif: 'image/tiff', tiff: 'image/tiff',
    pdf: 'application/pdf', mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    wmv: 'video/x-ms-wmv', webm: 'video/webm', mp3: 'audio/mpeg', txt: 'text/plain; charset=utf-8',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    zip: 'application/zip', csv: 'text/csv; charset=utf-8', rtf: 'application/rtf',
};

// IPS appends ".{32 hex}" to non-image attachments ("IMG_0092.MOV.1c38…"); the real
// extension is the one before the hash.
function contentTypeFor(rel, attachExt) {
    let name = rel.split('/').pop().replace(/\.[0-9a-f]{32}$/i, '');
    const ext = (attachExt || name.split('.').pop() || '').toLowerCase();
    return MIME[ext] || 'application/octet-stream';
}

const decodeEntities = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Every spelling a post uses for "a file under /forum/uploads".
const PREFIX = /(?:<fileStore\.[A-Za-z0-9_]+>|<___base_url___>\/uploads|(?:https?:)?\/\/(?:www\.)?gymnasticbodies\.com\/forum\/uploads|(?<![\w.])\/forum\/uploads)\//g;
const ATTACH_ID = /applications\/core\/interface\/file\/attachment\.php\?(?:[^"'\s<>]*?&(?:amp;)?)?id=(\d+)/g;
const ATTR = /=\s*(?:"([^"]*)"|'([^']*)')/g;

function refsInValue(value, out) {
    // srcset carries several urls, each optionally followed by " 2x" / " 640w".
    const parts = value.includes(', ') ? value.split(/,\s+/) : [value];
    for (const part of parts) {
        PREFIX.lastIndex = 0;
        let m;
        while ((m = PREFIX.exec(part))) {
            let rest = part.slice(m.index + m[0].length);
            const next = rest.search(/<fileStore\.|<___base_url___>|https?:\/\//);
            if (next > 0) rest = rest.slice(0, next);
            // Escaped markup inside an attribute (a quoted post stored as text) ends the url.
            rest = rest.split(/&quot;|"/)[0];
            rest = rest.replace(/\s+\d+(?:\.\d+)?[xw]\s*$/, '').replace(/[?#].*$/, '').trim();
            if (rest) out.add(decodeEntities(rest));
        }
    }
}

function extractRefs(html) {
    const paths = new Set(), ids = new Set();
    let m;
    ATTR.lastIndex = 0;
    while ((m = ATTR.exec(html))) refsInValue(m[1] ?? m[2], paths);
    // Bare urls in text (outside any attribute): stop at whitespace/quote/bracket.
    const text = html.replace(ATTR, '=""');
    PREFIX.lastIndex = 0;
    while ((m = PREFIX.exec(text))) {
        const rest = text.slice(m.index + m[0].length).match(/^[^\s"'<>]+/);
        if (rest) paths.add(decodeEntities(rest[0].replace(/[?#].*$/, '').replace(/[).,;]+$/, '')));
    }
    ATTACH_ID.lastIndex = 0;
    while ((m = ATTACH_ID.exec(html))) ids.add(Number(m[1]));
    return { paths, ids };
}

function loadBoxFiles() {
    const files = new Map();
    for (const line of fs.readFileSync(path.join(BACKUP, 'uploads-box-filelist.tsv'), 'utf8').split('\n')) {
        const i = line.indexOf('\t');
        if (i > 0) files.set(line.slice(i + 1), Number(line.slice(0, i)));
    }
    return files;
}

function loadAttachments() {
    const byId = new Map();
    for (const line of fs.readFileSync(path.join(BACKUP, 'core_attachments.jsonl'), 'utf8').split('\n')) {
        if (!line) continue;
        const r = JSON.parse(line);
        byId.set(Number(r.id), r);
    }
    return byId;
}

// A reference as written in a post -> the file's real relative path on the box.
function resolve(ref, box) {
    if (box.has(ref)) return ref;
    try { const d = decodeURIComponent(ref); if (box.has(d)) return d; } catch { /* not encoded */ }
    const plus = ref.replace(/\+/g, ' ');
    if (box.has(plus)) return plus;
    return null;
}

async function scan(sql, forumIds, onPost) {
    let last = 0;
    for (;;) {
        const rows = await sql`
            SELECT p.pid, p.html FROM forum_posts p
            JOIN forum_topics t ON t.tid = p.tid
            WHERE p.pid > ${last} AND NOT p.spam AND t.approved = 1 AND NOT t.spam
              AND t.forum_id = ANY(${forumIds})
            ORDER BY p.pid LIMIT 4000`;
        if (!rows.length) break;
        for (const r of rows) onPost(r);
        last = rows[rows.length - 1].pid;
    }
}

async function cmdRefs() {
    const sql = neon(process.env.DATABASE_URL);
    const box = loadBoxFiles();
    const attachments = loadAttachments();
    fs.mkdirSync(WORK, { recursive: true });

    const allForums = (await sql`SELECT id FROM forum_categories`).map((r) => r.id);
    const privateForums = allForums.filter((id) => !PUBLIC_FORUMS.includes(id));

    const collect = async (forumIds) => {
        const paths = new Map(), ids = new Map(); // ref -> post count
        let posts = 0, postsWithRefs = 0;
        await scan(sql, forumIds, (r) => {
            posts++;
            const x = extractRefs(r.html || '');
            if (x.paths.size || x.ids.size) postsWithRefs++;
            for (const p of x.paths) paths.set(p, (paths.get(p) || 0) + 1);
            for (const i of x.ids) ids.set(i, (ids.get(i) || 0) + 1);
        });
        return { paths, ids, posts, postsWithRefs };
    };

    const pub = await collect(PUBLIC_FORUMS);
    const priv = await collect(privateForums);

    const toFiles = (set) => {
        const files = new Map(), missing = [], idMap = {}, missingIds = [];
        for (const ref of set.paths.keys()) {
            const rel = resolve(ref, box);
            if (rel) files.set(rel, { size: box.get(rel) });
            else missing.push(ref);
        }
        for (const id of set.ids.keys()) {
            const a = attachments.get(id);
            const rel = a && resolve(a.loc, box);
            if (!rel) { missingIds.push({ id, location: a?.loc || null, name: a?.file || null }); continue; }
            files.set(rel, { size: box.get(rel), ext: a.ext });
            idMap[id] = { path: rel, name: a.file };
            // The thumbnail is what an image attachment actually displays inline.
            const th = a.thumb && resolve(a.thumb, box);
            if (th) files.set(th, { size: box.get(th) });
        }
        return { files, missing, idMap, missingIds };
    };

    const pubFiles = toFiles(pub), privFiles = toFiles(priv);
    const privateOnly = [...privFiles.files.keys()].filter((f) => !pubFiles.files.has(f));
    const sum = (keys) => keys.reduce((a, k) => a + (box.get(k) || 0), 0);

    const out = {
        generatedAt: new Date().toISOString(),
        publicForums: PUBLIC_FORUMS,
        postsScanned: pub.posts,
        postsWithRefs: pub.postsWithRefs,
        distinctPathRefs: pub.paths.size,
        distinctAttachmentIdRefs: pub.ids.size,
        files: [...pubFiles.files.entries()].map(([rel, v]) => ({ path: rel, size: v.size, contentType: contentTypeFor(rel, v.ext) })).sort((a, b) => a.path.localeCompare(b.path)),
        missingOnBox: pubFiles.missing.sort(),
        missingAttachmentIds: pubFiles.missingIds,
        attachmentIdMap: pubFiles.idMap,
        privateOnly: { files: privateOnly.length, bytes: sum(privateOnly), postsScanned: priv.posts },
    };
    out.bytes = out.files.reduce((a, f) => a + f.size, 0);
    fs.writeFileSync(REFS_FILE, JSON.stringify(out, null, 1));

    console.log('public posts scanned     :', out.postsScanned, '(with refs:', out.postsWithRefs + ')');
    console.log('distinct path refs       :', out.distinctPathRefs, '| attachment.php ids:', out.distinctAttachmentIdRefs);
    console.log('files to publish         :', out.files.length, (out.bytes / 1e6).toFixed(1) + ' MB');
    console.log('referenced, not on box   :', out.missingOnBox.length, '| attachment ids unresolved:', out.missingAttachmentIds.length);
    console.log('private-only (not pushed):', out.privateOnly.files, (out.privateOnly.bytes / 1e6).toFixed(1) + ' MB');
    const byType = {};
    for (const f of out.files) { byType[f.contentType] ??= { n: 0, b: 0 }; byType[f.contentType].n++; byType[f.contentType].b += f.size; }
    for (const [t, v] of Object.entries(byType).sort((a, b) => b[1].b - a[1].b)) console.log('  ', t.padEnd(28), String(v.n).padStart(6), (v.b / 1e6).toFixed(1).padStart(9) + ' MB');
    console.log('sample missing:', out.missingOnBox.slice(0, 15));
    console.log('->', REFS_FILE);
}

async function pool(items, n, fn) {
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => {
        while (i < items.length) { const it = items[i++]; await fn(it); }
    }));
}

function loadLedger() {
    const done = new Map();
    if (fs.existsSync(LEDGER)) for (const line of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
        if (!line) continue;
        const r = JSON.parse(line);
        if (r.ok) done.set(r.path, r.url);
    }
    return done;
}

async function cmdUpload() {
    const refs = JSON.parse(fs.readFileSync(REFS_FILE, 'utf8'));
    const done = loadLedger();
    const todo = refs.files.filter((f) => !done.has(f.path));
    console.log('referenced:', refs.files.length, '| already uploaded:', done.size, '| to do:', todo.length);
    let ok = 0, failed = 0, noLocal = 0;
    const log = fs.createWriteStream(LEDGER, { flags: 'a' });
    await pool(todo, 6, async (f) => {
        const local = path.join(LOCAL_UPLOADS, f.path);
        if (!fs.existsSync(local)) { noLocal++; log.write(JSON.stringify({ path: f.path, ok: false, error: 'not in local backup' }) + '\n'); return; }
        for (let attempt = 1; attempt <= 4; attempt++) {
            try {
                const res = await put(BLOB_PREFIX + f.path, fs.createReadStream(local), {
                    access: 'public', addRandomSuffix: false, allowOverwrite: true,
                    contentType: f.contentType, multipart: f.size > 20e6,
                    cacheControlMaxAge: 31536000,
                });
                log.write(JSON.stringify({ path: f.path, ok: true, url: res.url, size: f.size }) + '\n');
                ok++;
                if (ok % 250 === 0) console.log('  uploaded', ok, '/', todo.length);
                return;
            } catch (e) {
                if (attempt === 4) { failed++; log.write(JSON.stringify({ path: f.path, ok: false, error: String(e.message).slice(0, 300) }) + '\n'); console.log('  FAIL', f.path, String(e.message).slice(0, 120)); }
                else await new Promise((r) => setTimeout(r, 1500 * attempt));
            }
        }
    });
    await new Promise((r) => log.end(r));
    console.log('uploaded:', ok, '| failed:', failed, '| missing from local backup:', noLocal);
}

async function cmdVerify() {
    const refs = JSON.parse(fs.readFileSync(REFS_FILE, 'utf8'));
    const done = loadLedger();
    const notUploaded = refs.files.filter((f) => !done.has(f.path)).map((f) => f.path);
    let good = 0;
    const bad = [];
    await pool(refs.files.filter((f) => done.has(f.path)), 12, async (f) => {
        try {
            const h = await head(done.get(f.path));
            if (h.size === f.size) good++;
            else bad.push({ path: f.path, reason: `size ${h.size} != ${f.size}` });
        } catch (e) { bad.push({ path: f.path, reason: String(e.message).slice(0, 120) }); }
    });
    const any = done.values().next().value;
    const base = any ? any.slice(0, any.indexOf('/' + BLOB_PREFIX)) + '/' + BLOB_PREFIX.replace(/\/$/, '') : null;
    console.log('referenced:', refs.files.length, '| in blob with matching size:', good, '| bad:', bad.length, '| never uploaded:', notUploaded.length);
    console.log('FORUM_UPLOADS_BASE =', base);
    if (bad.length) console.log(bad.slice(0, 20));
    fs.writeFileSync(path.join(WORK, 'verify.json'), JSON.stringify({ base, referenced: refs.files.length, good, bad, notUploaded }, null, 1));
}

const cmd = process.argv[2];
if (cmd === 'refs') await cmdRefs();
else if (cmd === 'upload') await cmdUpload();
else if (cmd === 'verify') await cmdVerify();
else console.log('usage: forumUploads.mjs refs | upload | verify');
