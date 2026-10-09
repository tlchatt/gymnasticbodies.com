#!/usr/bin/env node
/**
 * Builds data/workout/classFinderCourses.json — the static course catalog behind my.'s
 * Class Finder (/class-finder), served by GET /api/user/workout/byo?op=class-finder.
 *
 * Output rows use the field shape the old AWS /welcome/users `myCourses` feed had, because
 * that is what my.'s ClassFinder grid, cards and course popup read:
 *   { wp_postid, image_url, media_id, legacy_course, playerScript, difficulty[], type[],
 *     duration[], minutes, classInfo: { title, description, playLists, workouts[], relatedCourses[] } }
 *
 * Sources (all local backups, read-only):
 *   ../claudePlans/class-finder-metadata.json   recovered difficulty/type/length per byo class
 *   data/workout/byoWorkouts.json               class names, media, images, descriptions
 *   ../courses_rds_backup_2026-07-24/course_catalog_service_db.sql
 *        gymfit_courses_classes  -> Jefferson Curl (not in byoWorkouts)
 *        related_courses         -> classInfo.relatedCourses
 *
 * Length rule: where real minutes exist (durationFromMinutes) they decide the bucket;
 * otherwise the old AWS duration tag(s) are used.
 *
 * Jefferson Curl: AWS reused wp_postid 60101 for both the course "Jefferson Curl" and the
 * sub-class "Elements 5 Lower/Core #4". byoWorkouts (and so every member schedule and the
 * Guided-Plans catalog) uses 60101 for the Elements day, so Jefferson Curl gets the string
 * key JEFFERSON_CURL_KEY instead. It can't be added to a schedule (no Neon class id).
 *
 * Run from app.gymnasticbodies.com:  node scripts/buildClassFinderCatalog.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const META = path.join(ROOT, '..', 'claudePlans', 'class-finder-metadata.json');
const SQL = path.join(ROOT, '..', 'courses_rds_backup_2026-07-24', 'course_catalog_service_db.sql');
const BYO = path.join(ROOT, 'data', 'workout', 'byoWorkouts.json');
const OUT = path.join(ROOT, 'data', 'workout', 'classFinderCourses.json');

const JEFFERSON_CURL_KEY = 'jefferson-curl';
const JEFFERSON_CURL_AWS_ROW_ID = 55;

// Minimal MySQL INSERT VALUES parser: returns arrays of values per tuple.
function parseInsert(sql, table) {
    const line = sql.split('\n').find(l => l.startsWith(`INSERT INTO \`${table}\` VALUES `));
    if (!line) throw new Error(`no INSERT for ${table}`);
    const s = line.slice(line.indexOf('VALUES ') + 7);
    const rows = [];
    let i = 0;
    while (i < s.length) {
        if (s[i] !== '(') { i++; continue; }
        i++;
        const row = [];
        while (s[i] !== ')') {
            if (s[i] === "'") {
                let v = '';
                i++;
                while (s[i] !== "'") {
                    if (s[i] === '\\') {
                        const n = s[i + 1];
                        v += n === 'r' ? '\r' : n === 'n' ? '\n' : n;
                        i += 2;
                    } else v += s[i++];
                }
                i++;
                row.push(v);
            } else {
                let v = '';
                while (s[i] !== ',' && s[i] !== ')') v += s[i++];
                row.push(v === 'NULL' ? null : Number(v));
            }
            if (s[i] === ',') i++;
        }
        i++;
        rows.push(row);
    }
    return rows;
}

const split = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);

const meta = JSON.parse(fs.readFileSync(META, 'utf8')).classes;
const byo = JSON.parse(fs.readFileSync(BYO, 'utf8'));
const sql = fs.readFileSync(SQL, 'utf8');

const byoById = new Map(byo.map(w => [Number(w.classId), w]));
const awsCourses = parseInsert(sql, 'gymfit_courses_classes').map(r => ({
    id: r[0], wp_postid: r[1], title: r[2], description: r[3], image_url: r[5], media_id: r[6],
    duration: r[7], training_type: r[8], difficulty: r[9], legacy_course: r[10],
}));
const awsById = new Map(awsCourses.map(c => [c.id, c]));
const keyForAwsRow = c => (c.id === JEFFERSON_CURL_AWS_ROW_ID ? JEFFERSON_CURL_KEY : c.wp_postid);

// related_courses: (id, gymfit_course_id, wp_postid, image_url). The related wp_postid
// always names a course, so 60101 there means Jefferson Curl.
const related = new Map();
for (const [, courseRowId, wpId] of parseInsert(sql, 'related_courses')) {
    const owner = awsById.get(courseRowId);
    if (!owner) continue;
    const key = keyForAwsRow(owner);
    const relKey = wpId === 60101 ? JEFFERSON_CURL_KEY : wpId;
    if (!related.has(key)) related.set(key, []);
    related.get(key).push({ wp_postid: relKey });
}

const lengthBucket = row => (row.durationFromMinutes ? [row.durationFromMinutes] : row.duration || []);

const subClassesOf = classId => meta
    .filter(r => r.role === 'subClass' && r.parentClassId === classId)
    .map(r => {
        const w = byoById.get(r.classId) || {};
        return {
            wp_postid: r.classId,
            title: r.className,
            content: w.description || '',
            image_url: r.image,
            media_id: r.mediaId,
            playLists: r.mediaId,
        };
    });

const courses = meta.filter(r => r.role === 'course').map(r => {
    const w = byoById.get(r.classId) || {};
    return {
        wp_postid: r.classId,
        image_url: r.image,
        media_id: r.mediaId || '',
        legacy_course: r.legacyCourse ? 'true' : 'false',
        playerScript: '',
        difficulty: r.difficulty,
        type: r.type,
        duration: lengthBucket(r),
        durationTags: r.duration,
        minutes: r.minutes ?? null,
        categoryLinks: r.categoryLinks || [],
        classInfo: {
            title: r.className,
            description: w.description || '',
            playLists: r.mediaId || '',
            workouts: subClassesOf(r.classId),
            relatedCourses: related.get(r.classId) || [],
        },
    };
});

const jc = awsById.get(JEFFERSON_CURL_AWS_ROW_ID);
if (!jc || jc.title !== 'Jefferson Curl') throw new Error('Jefferson Curl row not found');
courses.push({
    wp_postid: JEFFERSON_CURL_KEY,
    awsWpPostId: jc.wp_postid,
    image_url: jc.image_url,
    media_id: jc.media_id,
    legacy_course: jc.legacy_course,
    playerScript: '',
    difficulty: split(jc.difficulty),
    type: split(jc.training_type),
    duration: split(jc.duration),
    durationTags: split(jc.duration),
    minutes: null,
    categoryLinks: [],
    classInfo: {
        title: jc.title,
        description: jc.description,
        playLists: jc.media_id,
        workouts: [],
        relatedCourses: related.get(JEFFERSON_CURL_KEY) || [],
    },
});

fs.writeFileSync(OUT, JSON.stringify(courses, null, 1) + '\n');
console.log(`wrote ${courses.length} courses, ${courses.reduce((n, c) => n + c.classInfo.workouts.length, 0)} sub-classes -> ${path.relative(ROOT, OUT)}`);
