import s from './FeaturesList.module.css';

export default function FeaturesList({ title, subtitle, items = [] }) {
    return (
        <section className={s.features}>
            <div className={s.inner}>
                <div className={s.header}>
                    <h2 className={s.title} dangerouslySetInnerHTML={{ __html: title }} />
                    {subtitle && <p className={s.subtitle}>{subtitle}</p>}
                </div>
                <ul className={s.list}>
                    {items.map(({ label, detail }, i) => (
                        <li key={i} className={s.item}>
                            <div className={s.itemLeft}>
                                <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
                                <span className={s.name}>{label}</span>
                            </div>
                            <span className={s.detail}>{detail}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
