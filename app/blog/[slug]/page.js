import { permanentRedirect } from 'next/navigation';

export default async function BlogSlugRedirect({ params }) {
    const { slug } = await params;
    permanentRedirect(`/${slug}`);
}
