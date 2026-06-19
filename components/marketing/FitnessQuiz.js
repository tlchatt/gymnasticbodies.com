'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useMediaQuery } from '@/lib/MediaQueries';

const STEPS = ['welcome', 'gender', 'age', 'pushup', 'pullup', 'back', 'front', 'core', 'result'];

const PUSHUP_OPTIONS = [
    { label: '0 — I cannot yet', value: 0 },
    { label: '1–5', value: 1 },
    { label: '6–15', value: 2 },
    { label: '15+', value: 3 },
];

const PULLUP_OPTIONS = [
    { label: '0 — I cannot yet', value: 0 },
    { label: '1–3', value: 1 },
    { label: '4–8', value: 2 },
    { label: '8+', value: 3 },
];

const CORE_OPTIONS = [
    { label: 'I struggle to hold a plank for 20 seconds', value: 0 },
    { label: 'I can hold a plank 30–60 seconds', value: 1 },
    { label: 'I can do hanging knee raises', value: 2 },
    { label: 'I can do toes-to-bar or L-sit holds', value: 3 },
];

const BACK_MOBILITY = [
    { label: 'Level 1 — I cannot comfortably touch my toes', value: 1, desc: 'Hamstrings tight, limited forward fold' },
    { label: 'Level 2 — I can touch my toes with effort', value: 2, desc: 'Moderate hamstring and back flexibility' },
    { label: 'Level 3 — Palms flat on the floor', value: 3, desc: 'Good posterior chain flexibility' },
    { label: 'Level 4 — Full pancake or straddle splits', value: 4, desc: 'Advanced flexibility' },
];

const FRONT_MOBILITY = [
    { label: 'Level 1 — Hips and hip flexors very tight', value: 1, desc: 'Cannot lunge deeply or sit in a deep squat' },
    { label: 'Level 2 — Moderate hip flexibility', value: 2, desc: 'Can hold a lunge position but not comfortably' },
    { label: 'Level 3 — Good hip opening', value: 3, desc: 'Comfortable deep squat, moderate splits' },
    { label: 'Level 4 — Front splits or full hip flexor stretch', value: 4, desc: 'Advanced hip and front chain flexibility' },
];

const AGE_OPTIONS = ['Under 18', '18–29', '30–44', '45–59', '60+'];

function recommend(answers) {
    const { pushup = 0, pullup = 0, core = 0, back = 1, front = 1 } = answers;

    const strengthScore = Math.round((pushup + pullup + core) / 3);
    const mobilityScore = Math.round((back + front) / 2);
    const mobilityNeeded = mobilityScore <= 2;

    if (mobilityNeeded && strengthScore === 0) {
        return {
            program: 'Foundation + Mobility',
            headline: 'Start with the basics.',
            body: 'Your body needs both foundational strength and mobility work. We recommend starting with our Foundation program while adding targeted mobility sessions.',
            primary: { label: 'Hey Newbies →', href: '/hey-newbies' },
            secondary: { label: 'Mobility Program', href: '/mobility' },
        };
    }
    if (mobilityNeeded) {
        return {
            program: 'Mobility',
            headline: 'Unlock your mobility first.',
            body: 'Strong muscles in a restricted range of motion leads to injury. Build your flexibility foundation and you\'ll progress faster in strength training.',
            primary: { label: 'Mobility Program →', href: '/mobility' },
            secondary: { label: 'View All Programs', href: '/all-access' },
        };
    }
    if (strengthScore === 0) {
        return {
            program: 'Foundation',
            headline: 'Build from the ground up.',
            body: 'Great news — you have the mobility foundation. Now it\'s time to build real strength. Our Foundation program meets you exactly where you are.',
            primary: { label: 'Hey Newbies →', href: '/hey-newbies' },
            secondary: { label: 'View All Programs', href: '/all-access' },
        };
    }
    if (strengthScore >= 3) {
        return {
            program: 'All Access',
            headline: 'You\'re ready for everything.',
            body: 'You already have solid strength and mobility. All Access unlocks every program — follow structured progressions or explore at your own pace.',
            primary: { label: 'All Access →', href: '/all-access' },
            secondary: { label: 'Think Stronger', href: '/think-stronger' },
        };
    }
    if (strengthScore >= 2) {
        return {
            program: 'Body Weight',
            headline: 'Take your strength further.',
            body: 'You have a strong base. Body weight training will challenge you with progressions that build real functional strength.',
            primary: { label: 'Body Weight →', href: '/body-weight' },
            secondary: { label: 'All Access', href: '/all-access' },
        };
    }
    return {
        program: 'Think Stronger',
        headline: 'Think smarter, move stronger.',
        body: 'You have the foundation. Think Stronger will systematically build your capacity with structured progressions across strength, mobility, and body composition.',
        primary: { label: 'Think Stronger →', href: '/think-stronger' },
        secondary: { label: 'View All Programs', href: '/all-access' },
    };
}

export default function FitnessQuiz() {
    const [stepIndex, setStepIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const isSmall = useMediaQuery('(min-width: 640px)');
    const step = STEPS[stepIndex];
    const progress = stepIndex / (STEPS.length - 1);

    function answer(key, val) {
        setAnswers(a => ({ ...a, [key]: val }));
        setStepIndex(i => i + 1);
    }

    const shell = {
        maxWidth: 560,
        margin: '0 auto',
        padding: isSmall ? '64px 24px' : '40px 20px',
        fontFamily: 'var(--font-body)',
        color: 'var(--text)',
    };
    const progressBar = {
        height: 3,
        backgroundColor: 'var(--bg-overlay)',
        borderRadius: 99,
        marginBottom: 40,
        overflow: 'hidden',
    };
    const progressFill = {
        height: '100%',
        width: `${progress * 100}%`,
        background: 'var(--gradient-cta)',
        borderRadius: 99,
        transition: 'width 0.35s ease',
    };
    const heading = {
        fontFamily: 'var(--font-display)',
        fontSize: isSmall ? 36 : 28,
        fontWeight: 700,
        marginBottom: 8,
        lineHeight: 1.15,
    };
    const sub = {
        fontSize: 15,
        color: 'var(--text-muted)',
        marginBottom: 32,
        lineHeight: 1.6,
    };
    const optionBtn = {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '14px 18px',
        marginBottom: 10,
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-surface)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        fontSize: 15,
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s',
    };
    const optionBtnHover = {
        ...optionBtn,
        borderColor: 'var(--accent)',
        background: 'var(--bg-raised)',
    };
    const ctaBtn = {
        display: 'inline-block',
        padding: '14px 32px',
        background: 'var(--gradient-cta)',
        color: '#fff',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 17,
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        marginRight: 12,
        marginBottom: 10,
    };
    const ghostBtn = {
        display: 'inline-block',
        padding: '14px 32px',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: 15,
        borderRadius: 'var(--radius-sm)',
        textDecoration: 'none',
        marginBottom: 10,
    };

    function OptionButton({ children, onClick }) {
        const [hover, setHover] = useState(false);
        return (
            <button
                style={hover ? optionBtnHover : optionBtn}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onClick={onClick}
            >
                {children}
            </button>
        );
    }

    if (step === 'welcome') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Fitness Assessment
                </p>
                <h2 style={heading}>Find your perfect program.</h2>
                <p style={sub}>Answer 7 quick questions and we'll recommend the right starting point for your body and goals. Takes about 2 minutes.</p>
                <button
                    style={{ ...ctaBtn, border: 'none', cursor: 'pointer' }}
                    onClick={() => setStepIndex(1)}
                >
                    Get Started →
                </button>
            </div>
        );
    }

    if (step === 'gender') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <h2 style={heading}>How do you identify?</h2>
                <p style={sub}>Helps us personalize your experience (optional).</p>
                {['Male', 'Female', 'Other', 'Prefer not to say'].map(g => (
                    <OptionButton key={g} onClick={() => answer('gender', g)}>{g}</OptionButton>
                ))}
                <button style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', fontSize: 13, cursor: 'pointer', marginTop: 8 }} onClick={() => answer('gender', null)}>
                    Skip
                </button>
            </div>
        );
    }

    if (step === 'age') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <h2 style={heading}>What's your age range?</h2>
                <p style={sub}>Recovery and training intensity vary by age.</p>
                {AGE_OPTIONS.map(a => (
                    <OptionButton key={a} onClick={() => answer('age', a)}>{a}</OptionButton>
                ))}
            </div>
        );
    }

    if (step === 'pushup') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <h2 style={heading}>How many push-ups can you do in a row?</h2>
                <p style={sub}>Standard push-up, full range, unbroken.</p>
                {PUSHUP_OPTIONS.map(o => (
                    <OptionButton key={o.value} onClick={() => answer('pushup', o.value)}>{o.label}</OptionButton>
                ))}
            </div>
        );
    }

    if (step === 'pullup') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <h2 style={heading}>How many pull-ups can you do?</h2>
                <p style={sub}>Dead hang start, chin over bar, full extension each rep.</p>
                {PULLUP_OPTIONS.map(o => (
                    <OptionButton key={o.value} onClick={() => answer('pullup', o.value)}>{o.label}</OptionButton>
                ))}
            </div>
        );
    }

    if (step === 'back') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <h2 style={heading}>Posterior chain flexibility.</h2>
                <p style={sub}>Standing forward fold — how far can you go?</p>
                {BACK_MOBILITY.map(o => (
                    <OptionButton key={o.value} onClick={() => answer('back', o.value)}>
                        <span style={{ display: 'block', fontWeight: 600 }}>{o.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{o.desc}</span>
                    </OptionButton>
                ))}
            </div>
        );
    }

    if (step === 'front') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <h2 style={heading}>Hip and front chain flexibility.</h2>
                <p style={sub}>How open are your hips and hip flexors?</p>
                {FRONT_MOBILITY.map(o => (
                    <OptionButton key={o.value} onClick={() => answer('front', o.value)}>
                        <span style={{ display: 'block', fontWeight: 600 }}>{o.label}</span>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{o.desc}</span>
                    </OptionButton>
                ))}
            </div>
        );
    }

    if (step === 'core') {
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <h2 style={heading}>Core strength.</h2>
                <p style={sub}>Which best describes your core capacity?</p>
                {CORE_OPTIONS.map(o => (
                    <OptionButton key={o.value} onClick={() => answer('core', o.value)}>{o.label}</OptionButton>
                ))}
            </div>
        );
    }

    if (step === 'result') {
        const rec = recommend(answers);
        return (
            <div style={shell}>
                <div style={progressBar}><div style={progressFill} /></div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: 'var(--accent)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                    Your Recommendation
                </p>
                <h2 style={heading}>{rec.headline}</h2>
                <p style={{ ...sub, marginBottom: 20 }}>
                    <strong style={{ color: 'var(--text)', fontWeight: 600 }}>Recommended: {rec.program}</strong>
                </p>
                <p style={sub}>{rec.body}</p>
                <div style={{ marginTop: 12 }}>
                    <Link href={rec.primary.href} style={ctaBtn}>{rec.primary.label}</Link>
                    <Link href={rec.secondary.href} style={ghostBtn}>{rec.secondary.label}</Link>
                </div>
                <button
                    style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', fontSize: 13, cursor: 'pointer', marginTop: 16, display: 'block' }}
                    onClick={() => { setAnswers({}); setStepIndex(0); }}
                >
                    Retake quiz
                </button>
            </div>
        );
    }

    return null;
}
