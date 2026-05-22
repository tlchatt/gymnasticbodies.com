'use client';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FileDownloadDoneIcon from '@mui/icons-material/FileDownloadDone';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';

const ORANGE = '#f05621';
const ORANGE_LIGHT = '#fcb14e';
const DARK = '#1a1a1a';

const features = [
    'Now includes our nutrition course Thrive',
    'Over 350 Strength, 300 mobility, and 75 Handstand exercises',
    'Customizable training to match your fitness level and goals',
    '6+ Week Programs that adapt as you progress',
    'Short, Medium and Long workouts to suit your schedule',
];

const trustBadges = [
    { icon: <LockIcon sx={{ fontSize: 18 }} />, label: 'Secure payment' },
    { icon: <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />, label: 'Cancel anytime' },
    { icon: <TrackChangesIcon sx={{ fontSize: 18 }} />, label: '7-day free trial' },
];

export default function Subscribe() {
    return (
        <div style={{ minHeight: '100vh', background: '#fff' }}>

            {/* ── Dark hero ── */}
            <div style={{
                background: DARK,
                padding: '60px 16px 48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
            }}>
                <Typography variant="h4" component="h1" sx={{
                    color: '#fff',
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    mb: 1,
                    maxWidth: 480,
                }}>
                    Train Like a Gymnast
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.6)', mb: 4 }}>
                    Full access · New content weekly · Cancel anytime
                </Typography>

                {/* Pricing card */}
                <div style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '36px 40px',
                    width: '100%',
                    maxWidth: 360,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                }}>
                    <Typography variant="overline" sx={{ color: '#999', letterSpacing: 2, fontSize: '0.7rem' }}>
                        MONTHLY PLAN
                    </Typography>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <Typography variant="h3" component="span" sx={{ fontWeight: 800, color: DARK, lineHeight: 1 }}>
                            $75
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#888' }}>/ month</Typography>
                    </div>
                    <Typography variant="caption" sx={{ color: '#aaa', mb: 1 }}>
                        after 7-day free trial
                    </Typography>

                    <Button
                        variant="contained"
                        size="large"
                        href="/checkout?amount=75&term=monthly&trial=true"
                        fullWidth
                        sx={{
                            mt: 1,
                            py: 1.5,
                            fontSize: '1rem',
                            fontWeight: 700,
                            letterSpacing: 1,
                            borderRadius: 2,
                            background: `linear-gradient(135deg, ${ORANGE_LIGHT}, ${ORANGE})`,
                            boxShadow: `0 4px 20px rgba(240,86,33,0.4)`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${ORANGE}, #d44310)`,
                                boxShadow: `0 6px 24px rgba(240,86,33,0.5)`,
                            },
                        }}
                    >
                        START FOR FREE →
                    </Button>

                    <Typography variant="caption" sx={{ color: '#bbb', mt: 0.5 }}>
                        Billed monthly · No commitment
                    </Typography>
                </div>

                {/* Trust badges */}
                <div style={{
                    display: 'flex',
                    gap: 24,
                    marginTop: 24,
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                }}>
                    {trustBadges.map(({ icon, label }) => (
                        <div key={label} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'rgba(255,255,255,0.55)',
                            fontSize: '0.8rem',
                        }}>
                            {icon}
                            <span>{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Features section ── */}
            <div style={{
                background: '#fff',
                padding: '48px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <Typography variant="overline" sx={{
                    color: ORANGE,
                    letterSpacing: 3,
                    fontWeight: 700,
                    mb: 2,
                    fontSize: '0.7rem',
                }}>
                    EVERYTHING INCLUDED
                </Typography>
                <div style={{ maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {features.map((text) => (
                        <div key={text} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <FileDownloadDoneIcon sx={{ color: ORANGE, mt: '2px', flexShrink: 0 }} />
                            <Typography variant="body1" sx={{ color: '#333', lineHeight: 1.5 }}>
                                {text}
                            </Typography>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
