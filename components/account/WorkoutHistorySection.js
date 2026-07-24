/**
 * WorkoutHistorySection — workout activity summary + GitHub-style contribution heatmap.
 *
 * Props (from lib/accountData.js → getWorkoutHistorySection):
 *   days     : Array<{ date: string, count: number }>  — per-day logged count, 'YYYY-MM-DD', ascending
 *   total    : number                                    — total logged workouts
 *   sections : { [section]: { docs: number, logged: number } }  — per-section breakdown
 *
 * Renders (all light-theme, inline styles, orange #f05621 accent):
 *   - Stat strip (StatTile): total workouts, current streak, longest streak, active days.
 *   - A 12-month week×weekday contribution heatmap as inline SVG (horizontally scrollable),
 *     5 data-driven intensity buckets ramping muted gray → orange accent, month labels,
 *     Sun–Sat weekday labels, a Less→More legend, and a <title> tooltip on every cell.
 *   - A per-program breakdown list (Row) sorted by logged volume.
 */
import { AccountCard, Row, StatTile, ACCENT } from './accountUi';

const SECTION_LABELS = {
    levels: 'Guided Plans',
    history: 'Course History',
    byo: 'Build Your Own',
    autopilot: 'White Board',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']; // Sun..Sat — label Mon/Wed/Fri like GitHub

// Muted gray (level 0) → orange accent (level 4, busiest).
const LEVEL_COLORS = ['#ebedf0', '#fad8c7', '#f9b48f', '#f48760', ACCENT];

// Heatmap geometry
const CELL = 11;                 // cell edge in px
const GAP = 3;                   // gap between cells
const COL = CELL + GAP;          // column / row stride
const WEEKS = 53;                // ~12 months of week columns
const LEFT_PAD = 30;             // room for weekday labels
const TOP_PAD = 18;              // room for month labels
const DAY_MS = 86400000;

// ── date helpers (UTC — matches how `days[].date` keys are produced) ──────────
function parseKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}
function keyOf(ms) {
    return new Date(ms).toISOString().slice(0, 10);
}
function friendlyDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return `${MONTHS[m - 1]} ${d}, ${y}`;
}
function plural(n, unit) {
    return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

// Linear-interpolated quantile of a sorted ascending array.
function quantile(sorted, q) {
    if (sorted.length === 0) return 0;
    const pos = (sorted.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return sorted[base + 1] !== undefined
        ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
        : sorted[base];
}

// Three strictly-increasing cut points → 4 non-zero intensity buckets.
function computeThresholds(positive) {
    if (positive.length === 0) return [1, 2, 3];
    const max = positive[positive.length - 1];
    if (max <= 4) return [1, 2, 3]; // small counts: 1 | 2 | 3 | 4+
    const t1 = Math.max(1, Math.round(quantile(positive, 0.5)));
    const t2 = Math.max(t1 + 1, Math.round(quantile(positive, 0.8)));
    const t3 = Math.max(t2 + 1, Math.round(quantile(positive, 0.95)));
    return [t1, t2, t3];
}
function levelFor(count, [t1, t2, t3]) {
    if (count <= 0) return 0;
    if (count <= t1) return 1;
    if (count <= t2) return 2;
    if (count <= t3) return 3;
    return 4;
}

export default function WorkoutHistorySection({ days = [], total = 0, sections = {} }) {
    // ── streaks (from consecutive calendar days) ─────────────────────────────
    const activeDates = days.filter((d) => d.count > 0).map((d) => d.date);
    const activeSet = new Set(activeDates);
    const activeDays = activeSet.size;
    const sortedActive = [...activeSet].sort();

    let longestStreak = 0;
    let run = 0;
    let prevMs = null;
    for (const k of sortedActive) {
        const ms = parseKey(k);
        run = prevMs !== null && ms - prevMs === DAY_MS ? run + 1 : 1;
        if (run > longestStreak) longestStreak = run;
        prevMs = ms;
    }

    // Current streak = consecutive days ending today or yesterday (0 if lapsed).
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayMs = parseKey(todayKey);
    let cursor = null;
    if (activeSet.has(todayKey)) cursor = todayMs;
    else if (activeSet.has(keyOf(todayMs - DAY_MS))) cursor = todayMs - DAY_MS;
    let currentStreak = 0;
    while (cursor !== null && activeSet.has(keyOf(cursor))) {
        currentStreak += 1;
        cursor -= DAY_MS;
    }

    // ── heatmap grid ─────────────────────────────────────────────────────────
    const countByDay = new Map(days.map((d) => [d.date, d.count]));
    const positive = days.filter((d) => d.count > 0).map((d) => d.count).sort((a, b) => a - b);
    const thresholds = computeThresholds(positive);

    // Anchor the window's end at the most recent activity (or today if none),
    // then walk back 53 whole weeks aligned to Sunday.
    const endKey = days.length ? days[days.length - 1].date : todayKey;
    const endMs = parseKey(endKey);
    const endSunday = endMs - new Date(endMs).getUTCDay() * DAY_MS;
    const startMs = endSunday - (WEEKS - 1) * 7 * DAY_MS;

    const cells = [];
    for (let w = 0; w < WEEKS; w++) {
        for (let dow = 0; dow < 7; dow++) {
            const ms = startMs + (w * 7 + dow) * DAY_MS;
            if (ms > endMs) continue; // no cells past the anchor in the final partial week
            const key = keyOf(ms);
            const count = countByDay.get(key) || 0;
            cells.push({ w, dow, key, count, level: levelFor(count, thresholds) });
        }
    }

    // Month labels: first column of each new month, spaced out so they don't collide.
    const monthLabels = [];
    let lastMonth = -1;
    let lastLabelWeek = -99;
    for (let w = 0; w < WEEKS; w++) {
        const ms = startMs + w * 7 * DAY_MS;
        const mon = new Date(ms).getUTCMonth();
        if (mon !== lastMonth) {
            lastMonth = mon;
            if (w - lastLabelWeek >= 3) {
                monthLabels.push({ w, label: MONTHS[mon] });
                lastLabelWeek = w;
            }
        }
    }

    const svgWidth = LEFT_PAD + WEEKS * COL;
    const svgHeight = TOP_PAD + 7 * COL;
    const rangeCaption = days.length
        ? `${friendlyDate(keyOf(startMs))} – ${friendlyDate(endKey)}`
        : 'No activity yet';

    const sectionEntries = Object.entries(sections).sort((a, b) => b[1].logged - a[1].logged);

    // ── styles ───────────────────────────────────────────────────────────────
    const subHeadStyle = { fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#888', margin: '0 0 10px' };
    const scrollStyle = { overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' };
    const cellStroke = 'rgba(27,31,35,0.06)';
    const labelFill = '#767676';

    return (
        <AccountCard title="Workout History">
            {/* Stat strip */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '22px' }}>
                <StatTile label="Workouts logged" value={total} />
                <StatTile label="Current streak" value={currentStreak} />
                <StatTile label="Longest streak" value={longestStreak} />
                <StatTile label="Active days" value={activeDays} />
            </div>

            {/* Heatmap */}
            <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                    <p style={subHeadStyle}>Activity · last 12 months</p>
                    <span style={{ fontSize: '0.78rem', color: '#999' }}>{rangeCaption}</span>
                </div>

                <div style={scrollStyle}>
                    <svg
                        width={svgWidth}
                        height={svgHeight}
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        role="img"
                        aria-label="Workout contribution heatmap for the last 12 months"
                        style={{ display: 'block' }}
                    >
                        {/* Month labels */}
                        {monthLabels.map(({ w, label }) => (
                            <text
                                key={`m-${w}`}
                                x={LEFT_PAD + w * COL}
                                y={TOP_PAD - 6}
                                fontSize="10"
                                fill={labelFill}
                                fontFamily="inherit"
                            >
                                {label}
                            </text>
                        ))}

                        {/* Weekday labels (Mon / Wed / Fri) */}
                        {DOW_LABELS.map((label, dow) =>
                            label ? (
                                <text
                                    key={`d-${dow}`}
                                    x={LEFT_PAD - 6}
                                    y={TOP_PAD + dow * COL + CELL - 1}
                                    fontSize="9"
                                    fill={labelFill}
                                    textAnchor="end"
                                    fontFamily="inherit"
                                >
                                    {label}
                                </text>
                            ) : null
                        )}

                        {/* Day cells */}
                        {cells.map((c) => (
                            <rect
                                key={c.key}
                                x={LEFT_PAD + c.w * COL}
                                y={TOP_PAD + c.dow * COL}
                                width={CELL}
                                height={CELL}
                                rx={2}
                                ry={2}
                                fill={LEVEL_COLORS[c.level]}
                                stroke={cellStroke}
                                strokeWidth={1}
                            >
                                <title>{`${plural(c.count, 'workout')} on ${friendlyDate(c.key)}`}</title>
                            </rect>
                        ))}
                    </svg>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', marginTop: '8px', fontSize: '0.75rem', color: '#999' }}>
                    <span>Less</span>
                    {LEVEL_COLORS.map((color, i) => (
                        <span
                            key={`lg-${i}`}
                            title={i === 0 ? 'No workouts' : `Level ${i}`}
                            style={{ width: `${CELL}px`, height: `${CELL}px`, borderRadius: '2px', background: color, border: `1px solid ${cellStroke}`, display: 'inline-block' }}
                        />
                    ))}
                    <span>More</span>
                </div>
            </div>

            {/* Per-program breakdown */}
            {sectionEntries.length > 0 ? (
                <div>
                    <p style={subHeadStyle}>By program</p>
                    {sectionEntries.map(([section, s]) => (
                        <Row
                            key={section}
                            label={SECTION_LABELS[section] || section}
                            value={`${s.logged} logged · ${plural(s.docs, 'active day')}`}
                        />
                    ))}
                </div>
            ) : null}
        </AccountCard>
    );
}
