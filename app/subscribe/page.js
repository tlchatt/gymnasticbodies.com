'use client';
import { barlow, dm } from '@/lib/fonts';
import DarkNav from '@/components/DarkNav';
import PricingCard from '@/components/marketing/PricingCard';
import FeaturesList from '@/components/marketing/FeaturesList';
import BottomCta from '@/components/marketing/BottomCta';
import s from './subscribe.module.css';

const features = [
    { label: 'Thrive nutrition course', detail: 'Diet meets movement — now included' },
    { label: '700+ guided exercises', detail: '350 strength · 300 mobility · 75 handstand' },
    { label: 'Programs for every level', detail: 'Beginner through advanced, any age' },
    { label: '6+ week adaptive programs', detail: 'Evolve as you get stronger' },
    { label: 'Short, medium & long sessions', detail: 'Fits any schedule, anywhere' },
];

export default function Subscribe() {
    return (
        <div className={`${s.page} ${barlow.variable} ${dm.variable}`}>

            <DarkNav />

            {/* ── Hero ── */}
            <section className={s.hero}>
                <div className={s.glow} />
                <div className={s.inner}>

                    <span className={s.overline}>GymFit · by Gymnastic Bodies</span>

                    <h1 className={s.headline}>
                        Move like<br />
                        <span className={s.headlineOutline}>you were</span>
                        built for it.
                    </h1>

                    <p className={s.subtext}>
                        Restore mobility. Build real strength. Tens of thousands of students — every age, every level — training the gymnastic way.
                    </p>

                    <div className={s.pricingGrid}>
                        <PricingCard
                            label="Monthly"
                            price="$75"
                            unit="/ mo"
                            sub="after 7-day free trial"
                            ctaHref="/checkout?amount=75&term=monthly&trial=true"
                            ctaText="Start Free Trial →"
                            note="Cancel anytime · No commitment"
                        />
                        <PricingCard
                            label="Annual"
                            price="$60"
                            unit="/ mo"
                            sub="$720 billed annually · after 7-day free trial"
                            ctaHref="/checkout?amount=720&term=annually&trial=true"
                            ctaText="Start Free Trial →"
                            note="Save $180/year vs monthly"
                            featured
                            badge="Best Value"
                        />
                    </div>

                    <div className={s.trust}>
                        {['🔒 Secure checkout', '✓ Cancel anytime', '7-day free trial', '10,000+ members'].map(t => (
                            <span key={t} className={s.trustItem}>{t}</span>
                        ))}
                    </div>

                </div>
            </section>

            <FeaturesList
                title="Everything<br />included."
                subtitle="One membership. Every program, every exercise, every update."
                items={features}
            />

            <BottomCta
                overline="Start today"
                title="Your first 7 days are free."
                ctaHref="/checkout?amount=75&term=monthly&trial=true"
                ctaText="Get Started →"
                note="No credit card required to start"
                watermark="Go"
            />

        </div>
    );
}
