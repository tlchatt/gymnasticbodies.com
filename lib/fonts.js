import { Barlow_Condensed, DM_Sans } from 'next/font/google';

export const barlow = Barlow_Condensed({
    weight: ['700', '900'],
    style: ['normal', 'italic'],
    subsets: ['latin'],
    variable: '--font-display',
});

export const dm = DM_Sans({
    weight: ['300', '400', '500'],
    subsets: ['latin'],
    variable: '--font-body',
});
