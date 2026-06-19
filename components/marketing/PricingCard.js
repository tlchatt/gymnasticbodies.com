import Link from 'next/link';
import { ptToText } from '@/lib/ptUtils';
import s from './PricingCard.module.css';

function r(val) {
    return Array.isArray(val) ? ptToText(val) : (val || '');
}

export default function PricingCard({ label, price, unit, sub, ctaHref, ctaText, note, featured, badge }) {
    return (
        <div className={`${s.card} ${featured ? s.cardFeatured : ''}`}>
            {badge && <span className={s.badge}>{r(badge)}</span>}
            <p className={`${s.cardLabel} ${featured ? s.cardLabelFeatured : ''}`}>{r(label)}</p>
            <div className={s.priceRow}>
                <span className={s.priceAmount}>{r(price)}</span>
                <span className={s.priceUnit}>{r(unit)}</span>
            </div>
            {sub && <p className={s.priceSub}>{r(sub)}</p>}
            <Link href={ctaHref} className={s.ctaBtn}>{r(ctaText)}</Link>
            {note && <p className={`${s.cardNote} ${featured ? s.cardNoteFeatured : ''}`}>{r(note)}</p>}
        </div>
    );
}
