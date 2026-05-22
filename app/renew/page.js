import RenewClient from './RenewClient';
import content from '@/data/content/renew.json';

export const metadata = {
    title: content.meta.title,
    description: content.meta.description,
    robots: { index: false, follow: false },
};

export default function RenewPage() {
    return <RenewClient />;
}
