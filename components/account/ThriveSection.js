/**
 * ThriveSection — nutrition / Thrive summary.
 *
 * Props (from lib/accountData.js → getThriveSection):
 *   profile      : object | null   — thrive_profile: { weight, height1, height2, units, beforeImg?, currentImg?, ... }
 *   weightSeries : Array<{ date: string, weight: number }>   — measurements over time, ascending
 *   counts       : { tasksCompleted: number, permissionsUnlocked: number, measurements: number }
 *
 * Renders stat tiles (from profile + counts) and an inline-SVG weight sparkline.
 * Every field is guarded — a missing key just omits its tile/row, never throws.
 */
import { AccountCard, StatTile, Row, ACCENT } from './accountUi';

/** Build the sparkline geometry, or return null when there is nothing to draw. */
function buildSparkline(weightSeries, weightUnit) {
    const pts = (Array.isArray(weightSeries) ? weightSeries : [])
        .map((p) => ({ date: p?.date, weight: Number(p?.weight) }))
        .filter((p) => Number.isFinite(p.weight));

    const n = pts.length;
    if (n === 0) return null;

    const W = 320;
    const H = 64;
    const PAD = 6;
    const innerW = W - PAD * 2;
    const innerH = H - PAD * 2;

    const weights = pts.map((p) => p.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const span = max - min;

    const xFor = (i) => (n === 1 ? W / 2 : PAD + (i / (n - 1)) * innerW);
    const yFor = (w) => (span === 0 ? H / 2 : PAD + (1 - (w - min) / span) * innerH);

    const coords = pts.map((p, i) => ({ x: xFor(i), y: yFor(p.weight) }));
    const linePath = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const last = coords[coords.length - 1];

    const first = pts[0].weight;
    const lastW = pts[n - 1].weight;
    const titleText = `Weight: ${first}→${lastW} ${weightUnit} over ${n} ${n === 1 ? 'entry' : 'entries'}`;

    return { W, H, n, linePath, last, titleText };
}

const sparkWrapStyle = {
    marginBottom: '16px',
    background: '#faf7f5',
    border: '1px solid #f0e6e0',
    borderRadius: '8px',
    padding: '14px 18px',
};

const sparkLabelStyle = {
    fontSize: '0.8rem',
    color: '#777',
    marginBottom: '8px',
};

export default function ThriveSection({ profile, weightSeries = [], counts = {} }) {
    const isMetric = profile?.units === 1;
    const units = isMetric ? 'Metric' : 'Imperial';
    const weightUnit = isMetric ? 'kg' : 'lb';

    // Current weight: prefer the profile value, fall back to the latest measurement.
    const latest = weightSeries.length ? weightSeries[weightSeries.length - 1] : null;
    const rawWeight = profile?.weight != null ? Number(profile.weight) : (latest ? Number(latest.weight) : NaN);
    const currentWeight = Number.isFinite(rawWeight) ? rawWeight : null;

    const heightStr = profile?.height1 != null
        ? `${profile.height1}${isMetric ? ' cm' : "'"}${isMetric ? '' : ` ${profile?.height2 ?? 0}"`}`
        : null;

    const tasksCompleted = counts?.tasksCompleted ?? 0;
    const permissionsUnlocked = counts?.permissionsUnlocked ?? 0;
    const measurements = counts?.measurements ?? 0;

    const spark = buildSparkline(weightSeries, weightUnit);

    return (
        <AccountCard title="Nutrition (Thrive)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                {currentWeight != null ? <StatTile label="Current weight" value={`${currentWeight} ${weightUnit}`} /> : null}
                <StatTile label="Tasks completed" value={tasksCompleted} />
                <StatTile label="Lessons unlocked" value={permissionsUnlocked} />
                <StatTile label="Measurements" value={measurements} />
            </div>

            {spark ? (
                <div style={sparkWrapStyle}>
                    <div style={sparkLabelStyle}>Weight trend</div>
                    <svg
                        role="img"
                        viewBox={`0 0 ${spark.W} ${spark.H}`}
                        width="100%"
                        height={spark.H}
                        preserveAspectRatio="none"
                        style={{ display: 'block', overflow: 'visible' }}
                    >
                        <title>{spark.titleText}</title>
                        {spark.n > 1 ? (
                            <polyline
                                points={spark.linePath}
                                fill="none"
                                stroke={ACCENT}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                vectorEffect="non-scaling-stroke"
                            />
                        ) : null}
                        <circle cx={spark.last.x} cy={spark.last.y} r="3.5" fill={ACCENT} />
                    </svg>
                </div>
            ) : null}

            <Row label="Units" value={profile ? units : null} />
            <Row label="Height" value={heightStr} />
            <Row label="Measurements logged" value={measurements ? String(measurements) : null} />
        </AccountCard>
    );
}
