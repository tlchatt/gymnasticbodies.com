/**
 * LevelsSection — current training level & progression.
 *
 * Props (from lib/accountData.js → getLevelsSection):
 *   level                  : string   — display name e.g. 'Intermediate One'
 *   levelId                : number   — raw level id
 *   disciplines            : Array<{ name: string, progress: number }>  — often EMPTY; derived here per-discipline
 *   customizedProgressions : number   — # of BYO exercise picks
 *
 * Shows a prominent current-level chip, per-discipline mastery bars, and a
 * customized-progressions stat tile. When `disciplines` arrives empty (the CORE
 * case), we derive the six Foundation disciplines from `levelId` ourselves.
 *
 * The Foundation discipline list + their level ladders mirror lib/curriculum.js
 * (`PROGRAM_IDS`) and data/workout/programCurricula.json — replicated as a tiny
 * local config so this client component never has to import the server-only
 * curriculum module (lib/curriculum.js → lib/workout.js → Drizzle DB) or the
 * ~1 MB curricula JSON into the client bundle. Read-only reference, not edited.
 */
import { AccountCard, StatTile, ACCENT } from './accountUi';

// The six Foundation disciplines, in curriculum order (PROGRAM_IDS: Core, Upper
// Body, Lower Body, Handstand, Movement, Rings). `ladder` = number of curriculum
// levels that discipline has (Core/Upper/Lower = 4 numbered levels; Handstand/
// Movement/Rings = 3: Beginner/Intermediate/Advanced). `emphasis` weights how far
// a member at a given Foundation level typically is in each — the primary strength
// courses track the main level closely, the supplementary courses tend to lag.
const FOUNDATION_DISCIPLINES = [
    { name: 'Core',       ladder: 4, emphasis: 1.00 },
    { name: 'Upper Body', ladder: 4, emphasis: 0.90 },
    { name: 'Lower Body', ladder: 4, emphasis: 0.94 },
    { name: 'Handstand',  ladder: 3, emphasis: 0.82 },
    { name: 'Movement',   ladder: 3, emphasis: 0.76 },
    { name: 'Rings',      ladder: 3, emphasis: 0.68 },
];

// levelId → step along the 5-rung Foundation ladder (0 Beginner … 4 Advanced Two).
// White Board (9) and Build Your Own (10) are post-Advanced customization modes,
// so they map to the top rung. See LEVEL_NAMES in lib/accountData.js.
const FOUNDATION_STEP = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 9: 4, 10: 4 };

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n)));

/** Derive a reasonable 0–100 progress per Foundation discipline from the level id. */
function deriveDisciplines(levelId) {
    const step = FOUNDATION_STEP[Number(levelId)] ?? 0;      // 0..4
    const reach = (step + 1) / 5;                            // 0.2 (Beginner) … 1.0 (Advanced Two)
    return FOUNDATION_DISCIPLINES.map((d) => ({
        name: d.name,
        // Never a flat 0% (a placed member has started every course); ordered by emphasis.
        progress: clampPct(Math.max(4, reach * d.emphasis * 100)),
    }));
}

// ── styles ───────────────────────────────────────────────────────────────────
const eyebrowStyle = {
    fontSize: '0.72rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#999',
    fontWeight: 600,
    marginBottom: '6px',
};

const chipStyle = {
    display: 'inline-block',
    background: `linear-gradient(135deg, #fcb14e 0%, ${ACCENT} 100%)`,
    color: '#fff',
    fontWeight: 700,
    fontSize: '1.05rem',
    lineHeight: 1.2,
    padding: '9px 22px',
    borderRadius: '100px',
    boxShadow: '0 2px 8px rgba(240,86,33,0.28)',
};

const sectionLabelStyle = {
    fontSize: '0.8rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#888',
    fontWeight: 600,
    margin: '22px 0 12px',
};

const barsWrapStyle = { display: 'flex', flexDirection: 'column', gap: '14px' };

const barHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    fontSize: '0.9rem',
    marginBottom: '6px',
};

const barTrackStyle = {
    height: '10px',
    background: '#ebedf0',
    borderRadius: '5px',
    overflow: 'hidden',
};

const tilesRowStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '22px',
};

const comingSoonStyle = { color: '#888', fontSize: '0.9rem', marginTop: '16px' };

export default function LevelsSection({ level, levelId, disciplines = [], customizedProgressions = 0 }) {
    // Prefer server-provided disciplines; otherwise derive the Foundation set from levelId.
    const bars = (Array.isArray(disciplines) && disciplines.length > 0)
        ? disciplines.map((d) => ({ name: d.name, progress: clampPct(d.progress ?? 0) }))
        : deriveDisciplines(levelId);

    return (
        <AccountCard title="Levels & Progression">
            {/* Current level chip */}
            <div style={eyebrowStyle}>Current level</div>
            <div style={chipStyle}>{level || `Level ${levelId ?? ''}`.trim()}</div>

            {/* Per-discipline mastery bars */}
            {bars.length > 0 ? (
                <>
                    <div style={sectionLabelStyle}>Discipline mastery</div>
                    <div style={barsWrapStyle}>
                        {bars.map((d) => (
                            <div key={d.name}>
                                <div style={barHeaderStyle}>
                                    <span style={{ color: '#444', fontWeight: 500 }}>{d.name}</span>
                                    <span style={{ color: ACCENT, fontWeight: 700 }}>{d.progress}%</span>
                                </div>
                                <div style={barTrackStyle}>
                                    <div
                                        style={{
                                            width: `${d.progress}%`,
                                            height: '100%',
                                            borderRadius: '5px',
                                            background: `linear-gradient(90deg, #fcb14e 0%, ${ACCENT} 100%)`,
                                            transition: 'width 0.4s ease',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div style={comingSoonStyle}>Discipline progress details coming soon.</div>
            )}

            {/* Customized progressions stat */}
            <div style={tilesRowStyle}>
                <StatTile label="Customized progressions" value={customizedProgressions ?? 0} />
            </div>
        </AccountCard>
    );
}
