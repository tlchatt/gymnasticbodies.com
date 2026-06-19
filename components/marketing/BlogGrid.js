'use client';
import { useMediaQuery } from '@/lib/MediaQueries';
import BlogCard from './BlogCard';

export default function BlogGrid({ posts = [] }) {
    const isLarge = useMediaQuery('(min-width: 1024px)');
    const isSmall = useMediaQuery('(min-width: 640px)');

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: isLarge ? 'repeat(3, 1fr)' : isSmall ? 'repeat(2, 1fr)' : '1fr',
        gap: '2rem',
    };

    if (!posts.length) {
        return <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)', padding: '2rem 0' }}>No posts found.</p>;
    }

    return (
        <div style={gridStyle}>
            {posts.map((post) => (
                <BlogCard
                    key={post.id}
                    slug={post.slug}
                    title={post.title}
                    excerpt={post.meta?.description || ''}
                    featuredImage={post.featuredImage}
                    category={post.category}
                    publishedAt={post.publishedAt}
                />
            ))}
        </div>
    );
}
