'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import s from './DarkNav.module.css';

export default function DarkNav() {
    const [open, setOpen] = useState(false);

    return (
        <nav className={s.nav}>
            <div className={s.inner}>
                <a href="https://my.gymnasticbodies.com/" className={s.logo}>
                    <Image
                        src="/images/GFmarkandName.webp"
                        alt="GymFit by Gymnastic Bodies"
                        width={140}
                        height={40}
                        style={{ objectFit: 'contain' }}
                    />
                </a>

                <div className={`${s.links} ${open ? s.linksOpen : ''}`}>
                    <Link href="https://my.gymnasticbodies.com/" className={s.signIn}>Sign In</Link>
                    <Link href="/subscribe" className={s.cta}>Get Started</Link>
                </div>

                <button
                    className={s.hamburger}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    onClick={() => setOpen(v => !v)}
                >
                    <span className={`${s.bar} ${open ? s.barOpen1 : ''}`} />
                    <span className={`${s.bar} ${open ? s.barOpen2 : ''}`} />
                    <span className={`${s.bar} ${open ? s.barOpen3 : ''}`} />
                </button>
            </div>
        </nav>
    );
}
