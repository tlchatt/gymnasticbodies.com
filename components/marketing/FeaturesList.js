import { ptToText } from '@/lib/ptUtils';
import s from './FeaturesList.module.css';

function r(val) {
    return Array.isArray(val) ? ptToText(val) : (val || '');
}

export default function FeaturesList({ title, subtitle, items = [] }) {
    const titleStr = r(title);
    const subtitleStr = r(subtitle);

    return (
        <section className={s.features}>
            <div className={s.inner}>
                <div className={s.header}>
                    {/* dangerouslySetInnerHTML preserved for legacy HTML strings (e.g. <br />) */}
                    <h2 className={s.title} dangerouslySetInnerHTML={{ __html: titleStr }} />
                    {subtitleStr && <p className={s.subtitle}>{subtitleStr}</p>}
                </div>
                <ul className={s.list}>
                    {items.map((item, i) => (
                        <li key={i} className={s.item}>
                            <div className={s.itemLeft}>
                                <span className={s.num}>{String(i + 1).padStart(2, '0')}</span>
                                <span className={s.name}>{r(item.label)}</span>
                            </div>
                            <span className={s.detail}>{r(item.detail)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
