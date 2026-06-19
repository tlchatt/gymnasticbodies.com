'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMediaQuery } from '@/lib/MediaQueries';
import BlogGrid from '@/components/marketing/BlogGrid';

export default function BlogClientContent({ posts, categories, currentCategory, currentPage }) {
    const router = useRouter();
    const isLarge = useMediaQuery('(min-width: 1024px)');

    const filterBtn = (active) => ({
        background: active ? 'var(--gradient-cta)' : 'var(--bg-surface)',
        border: `1px solid ${active ? 'transparent' : 'var(--border-subtle)'}`,
        borderRadius: 'var(--radius-pill)',
        color: active ? '#fff' : 'var(--text-muted)',
        fontSize: '0.8rem',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        letterSpacing: '0.04em',
        padding: '0.35rem 1rem',
        cursor: 'pointer',
        textTransform: 'uppercase',
    });

    function setCategory(cat) {
        const params = new URLSearchParams();
        if (cat) params.set('category', cat);
        router.push(`/blog?${params.toString()}`);
    }

    return (
        <div style={{ backgroundColor: 'var(--bg-base)', padding: isLarge ? '5rem 2rem 3.5rem' : '4rem 1.25rem 2rem' }}>
            <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{ color: 'var(--text)', fontSize: isLarge ? '3.5rem' : '2.25rem', fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                        Blog
                    </h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <button style={filterBtn(!currentCategory)} onClick={() => setCategory(null)}>All</button>
                        {categories.map(cat => (
                            <button key={cat} style={filterBtn(currentCategory === cat)} onClick={() => setCategory(cat)}>{cat}</button>
                        ))}
                    </div>
                </div>

                <BlogGrid posts={posts} />

                {posts.length === 12 && (
                    <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                        <Link
                            href={`/blog?page=${currentPage + 1}${currentCategory ? `&category=${currentCategory}` : ''}`}
                            style={{ display: 'inline-block', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', padding: '0.6rem 1.5rem', textDecoration: 'none' }}
                        >
                            Load more →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
