import Link from 'next/link';
import s from './BottomCta.module.css';

export default function BottomCta({ overline, title, ctaHref, ctaText, note, watermark }) {
    return (
        <section className={s.section}>
            {watermark && <div className={s.watermark}>{watermark}</div>}
            <div className={s.content}>
                {overline && <span className={s.overline}>{overline}</span>}
                <h3 className={s.title}>{title}</h3>
                <Link href={ctaHref} className={s.btn}>{ctaText}</Link>
                {note && <p className={s.note}>{note}</p>}
            </div>
        </section>
    );
}
