import Link from 'next/link';
import s from './PricingCard.module.css';

export default function PricingCard({ label, price, unit, sub, ctaHref, ctaText, note, featured, badge }) {
    return (
        <div className={`${s.card} ${featured ? s.cardFeatured : ''}`}>
            {badge && <span className={s.badge}>{badge}</span>}
            <p className={`${s.cardLabel} ${featured ? s.cardLabelFeatured : ''}`}>{label}</p>
            <div className={s.priceRow}>
                <span className={s.priceAmount}>{price}</span>
                <span className={s.priceUnit}>{unit}</span>
            </div>
            {sub && <p className={s.priceSub}>{sub}</p>}
            <Link href={ctaHref} className={s.ctaBtn}>{ctaText}</Link>
            {note && <p className={`${s.cardNote} ${featured ? s.cardNoteFeatured : ''}`}>{note}</p>}
        </div>
    );
}
