'use client';
import Link from 'next/link';
import { useState, Fragment } from 'react';
import { useMediaQuery } from '@/lib/MediaQueries';
import { ptToText } from '@/lib/portableText';

const BeginnerIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 116.49 92.28" style={{ width: '100%', height: '100%' }} fill="currentColor">
        <path d="M263.31,357.88a7.94,7.94,0,1,1,7.94,7.94h0a7.93,7.93,0,0,1-7.94-7.93Z" transform="translate(-247.47 -349.95)"/>
        <path d="M288.73,397.18c-2-1.76-12.8-4.38-12.8-4.38s.08-4,.1-4.05.1-.5.24-1.69c3.44.41,7.22.77,8.84,1.05,3,.52,5-5.94,1-6.65-2.53-.46-6.67-.95-9.35-1.25,0-.38,0-.76.05-1.17.28-7.27-2.46-10.78-2.46-10.78a3.15,3.15,0,0,0-1.37-.58,36.37,36.37,0,0,0-6.33-.68,3.6,3.6,0,0,0-2.56,1.18c-1,.91-9.67,7.84-10.35,9.44s-1,10.54-.67,13.55c.29,2.62,5.23,4.07,5.66.62s.77-10.34.77-10.34l4-2.44.31,11.22-.1,9.42s1.47,12.07,1,14-4.85,12.82-5.84,16.58S264,435.71,265,432c.75-2.85,6.73-14.62,6.91-17s.68-13.42.68-13.42,7.94.92,9.26,1.8-.56,10.3-.56,12c0,3.24,6.82,3.65,6.82,0C288.09,413.58,290.41,398.7,288.73,397.18Z" transform="translate(-247.47 -349.95)"/>
        <path d="M292.39,442.22H247.47v-6.39h38.65l.24-12.8h25.45l.35-12.79h24.32l-.15-14.4H364v6.4H342.79l.15,14.4H318.38L318,429.43H292.63Z" transform="translate(-247.47 -349.95)"/>
    </svg>
);

const AdvancedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 107.77 71.68" style={{ width: '100%', height: '100%' }} fill="currentColor">
        <path d="M355.59,361.57c-7.19,4.16-49.18,34.1-49.22,34.08L286.5,408.38s-4.17-10.87-8.13-13.13c-2.07-1.18-19.76,1.83-24,4.65s-.78,8.71,3.57,8.34c5-.44,15.61-1.33,15.61-1.33l.53,2.85a11.66,11.66,0,1,0,5.88,18.88h0c2.81,2,7.44,2.88,11.65,2.32,3.52-.47,8.69-4.46,11.05-7.66,3.4-4.62,12.81-11,15.14-11.94a15,15,0,0,0,8.06-6.17c1.64-2.42,31.29-36.39,33.4-38S359.84,359.12,355.59,361.57Z" transform="translate(-252.41 -361.02)"/>
    </svg>
);

const MobilityIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 75.12 56" style={{ width: '100%', height: '100%' }} fill="currentColor">
        <path d="M289.67,407.14c15.44,2.07,30.89,4.08,46.31,6.26,3,.42,6.85.22,6.82,4.94,0,3.46-1.28,5.66-5.32,5.66-19.12,0-38.24.22-57.37.21-8.37,0-12.92-5.56-10.65-13.62,4-14.29,18.57-21.75,22.35-24,6.73-3.95,15-5.22,18.72-2.37a41.66,41.66,0,0,1,6,5.65c5.71,6,12.9,8.31,20.78,9.31a8.64,8.64,0,0,1,4,1.11c1.22.93,2.91,2.84,2.62,3.77-.47,1.48-2.47,3.65-3.69,3.56-9.82-.71-17.19-.63-28.5-6.13-1.82-1.36-5.93-.46-8.9.36C298.86,403,292.37,404.9,289.67,407.14Z" transform="translate(-268.88 -368.21)"/>
        <path d="M323.71,368.27c5.77.42,9.53,4.91,9,10.79a9.91,9.91,0,0,1-10.43,9.08,10,10,0,0,1-9.38-10.64v-.09a9.71,9.71,0,0,1,10.19-9.19Z" transform="translate(-268.88 -368.21)"/>
    </svg>
);

const BodyweightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 91.47 91.47" style={{ width: '100%', height: '100%' }} fill="currentColor">
        <path d="M351.45,396.09A45.39,45.39,0,0,0,346.82,376v-17.9H331.23a45.73,45.73,0,0,0-51,0H265.59v16a45.73,45.73,0,0,0,0,43.89v21.33h25.34a45.54,45.54,0,0,0,29.53,0h26.36V416.11a45.56,45.56,0,0,0,4.63-20Zm-8.25-34.34v8.14a45.89,45.89,0,0,0-7.29-8.14Zm-51.68,74c-.9-.32-1.79-.68-2.67-1.06l2.76,1,13.59-30.39h2l13.47,30.13-.76.28Zm33.5-2.22L315.58,403V384.24l24.13-10.41L338,369.48l-29.41,10.07h-4.69l-29.41-10.07-1.74,4.35,24.13,10.41V403l-9.57,31a42.22,42.22,0,0,1-18-16.88V375.11a42.31,42.31,0,0,1,12.14-13.36h21.35a7,7,0,1,0,7,0h20.35a42.42,42.42,0,0,1,13.15,15.18v38.34A42.3,42.3,0,0,1,325,433.51ZM305.72,354h0a42,42,0,0,1,18.2,4.15H287.48A41.88,41.88,0,0,1,305.72,354Zm-36.5,7.77h6.3a46,46,0,0,0-6.3,6.78Zm-5.61,34.34a42.12,42.12,0,0,1,2-12.77v25.53A42,42,0,0,1,263.61,396.09Zm5.61,39.64V423.64a46.06,46.06,0,0,0,13.71,12.09Zm74,0H328.47a46.13,46.13,0,0,0,14.73-13.48Zm3.62-30.52V387a41.55,41.55,0,0,1,0,18.21Z" transform="translate(-259.98 -350.35)"/>
    </svg>
);

const PROGRAMS = [
    { slug: '/hey-newbies', label: 'Beginners', Icon: BeginnerIcon },
    { slug: '/think-stronger', label: 'Intermediate & Advanced Athletes', Icon: AdvancedIcon },
    { slug: '/mobility', label: 'Overcoming Pain and Injury', Icon: MobilityIcon },
    { slug: '/body-weight', label: 'Our Training Methodology', Icon: BodyweightIcon },
];

function ProgramItem({ slug, label, Icon, isSmall }) {
    const [hovered, setHovered] = useState(false);

    const itemStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        textDecoration: 'none',
        padding: isSmall ? '1.5rem 1rem' : '1rem 0.5rem',
        flex: '1 1 0',
        minWidth: 0,
        color: hovered ? 'var(--accent)' : 'rgba(255,255,255,0.75)',
        transition: 'color 0.2s ease',
    };

    const iconWrapStyle = {
        width: isSmall ? '70px' : '52px',
        height: isSmall ? '70px' : '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    };

    const labelStyle = {
        color: hovered ? 'var(--accent)' : 'var(--text)',
        fontSize: '0.85rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        textAlign: 'center',
        lineHeight: 1.3,
        transition: 'color 0.2s ease',
    };

    return (
        <Link
            href={slug}
            style={itemStyle}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div style={iconWrapStyle}>
                <Icon />
            </div>
            <span style={labelStyle}>{label}</span>
        </Link>
    );
}

export default function ProgramGrid({ heading, subtext }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const isSmall = useMediaQuery('(min-width: 640px)');

    const sectionStyle = {
        backgroundColor: 'var(--bg-surface)',
        padding: isLarge ? '4rem 2rem' : '2.5rem 1.25rem',
        borderTop: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
    };

    const rowStyle = {
        display: 'flex',
        flexDirection: isSmall ? 'row' : 'column',
        flexWrap: isSmall && !isLarge ? 'wrap' : 'nowrap',
        gap: isSmall ? '0' : '1.5rem',
        alignItems: 'stretch',
    };

    const dividerStyle = {
        width: '1px',
        backgroundColor: 'var(--border-subtle)',
        alignSelf: 'stretch',
        flexShrink: 0,
    };

    return (
        <section style={sectionStyle}>
            <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
                {(heading || subtext) && (
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        {heading && (
                            <h2 style={{
                                color: 'var(--text)',
                                fontSize: isLarge ? '2.5rem' : '1.75rem',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 900,
                                lineHeight: 1.0,
                                letterSpacing: '-0.01em',
                                textTransform: 'uppercase',
                                marginBottom: subtext ? '0.75rem' : 0,
                            }}>
                                {ptToText(heading)}
                            </h2>
                        )}
                        {subtext && (
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontFamily: 'var(--font-body)', fontWeight: 400 }}>
                                {ptToText(subtext)}
                            </p>
                        )}
                    </div>
                )}
                <div style={rowStyle}>
                    {PROGRAMS.map((program, i) => (
                        <Fragment key={program.slug}>
                            <ProgramItem {...program} isSmall={isSmall} />
                            {i < PROGRAMS.length - 1 && isSmall && (
                                <div style={dividerStyle} />
                            )}
                        </Fragment>
                    ))}
                </div>
            </div>
        </section>
    );
}
