import { barlow, dm } from '@/lib/fonts';
import DarkNav from '@/components/DarkNav';
import SubscribeTracker from './SubscribeTracker';
import PricingCard from '@/components/marketing/PricingCard';
import FeaturesList from '@/components/marketing/FeaturesList';
import BottomCta from '@/components/marketing/BottomCta';
import s from './subscribe.module.css';
import content from '@/data/content/subscribe.json';

export const metadata = {
    title: content.meta.title,
    description: content.meta.description,
    openGraph: {
        title: content.meta.ogTitle,
        description: content.meta.ogDescription,
        images: [{ url: content.meta.ogImage, width: 1200, height: 630, alt: content.meta.ogTitle }],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: content.meta.ogTitle,
        description: content.meta.ogDescription,
    },
};

export default function Subscribe() {
    const { hero, pricing, trust, features, cta } = content;

    return (
        <div className={`${s.page} ${barlow.variable} ${dm.variable}`}>
            <SubscribeTracker />
            <DarkNav />

            {/* ── Hero ── */}
            <section className={s.hero}>
                <div className={s.glow} />
                <div className={s.inner}>

                    <span className={s.overline}>{hero.overline}</span>

                    <h1 className={s.headline}>
                        {hero.headlineLine1}<br />
                        <span className={s.headlineOutline}>{hero.headlineLine2}</span>
                        {hero.headlineLine3}
                    </h1>

                    <p className={s.subtext}>{hero.subtext}</p>

                    <div className={s.pricingGrid}>
                        {pricing.map(p => <PricingCard key={p.id} {...p} />)}
                    </div>

                    <div className={s.trust}>
                        {trust.map(t => (
                            <span key={t} className={s.trustItem}>{t}</span>
                        ))}
                    </div>

                </div>
            </section>

            <FeaturesList
                title={features.title}
                subtitle={features.subtitle}
                items={features.items}
            />

            <BottomCta {...cta} />

        </div>
    );
}
