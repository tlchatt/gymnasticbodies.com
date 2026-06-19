import { getSiteSettings } from '@/lib/siteSettings';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import FitnessQuiz from '@/components/marketing/FitnessQuiz';

export const metadata = {
    title: 'Find Your Program',
    description: 'Answer a few quick questions and we\'ll recommend the right GymFit program for your body and goals.',
};

export default async function QuizPage() {
    const { nav, footer } = await getSiteSettings('nav', 'footer');

    return (
        <MarketingLayout navData={nav} footerData={footer}>
            <div style={{ minHeight: '80vh', backgroundColor: 'var(--bg-base)' }}>
                <FitnessQuiz />
            </div>
        </MarketingLayout>
    );
}
