import Link from 'next/link';
import { ptToText } from '@/lib/ptUtils';
import s from './BottomCta.module.css';

function r(val) {
    return Array.isArray(val) ? ptToText(val) : (val || '');
}

export default function BottomCta({ overline, title, ctaHref, ctaText, note, watermark }) {
    return (
        <section className={s.section}>
            {watermark && <div className={s.watermark}>{r(watermark)}</div>}
            <div className={s.content}>
                {overline && <span className={s.overline}>{r(overline)}</span>}
                <h3 className={s.title}>{r(title)}</h3>
                <Link href={ctaHref} className={s.btn}>{r(ctaText)}</Link>
                {note && <p className={s.note}>{r(note)}</p>}
            </div>
        </section>
    );
}
