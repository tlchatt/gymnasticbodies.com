'use client';

import { PortableText as BasePortableText } from '@portabletext/react';
import Link from 'next/link';
export { ptToText, textToPt } from '@/lib/ptUtils';

const components = {
  types: {
    navLink: ({ value }) => (
      <Link href={value.href || '#'}>
        <BasePortableText value={value.text || []} />
      </Link>
    ),
    ctaButton: ({ value }) => (
      <a href={value.href || '#'} data-variant={value.variant || 'solid'}>
        <BasePortableText value={value.text || []} />
      </a>
    ),
    socialLink: ({ value }) => (
      <a href={value.href || '#'} target="_blank" rel="noopener noreferrer" data-platform={value.platform}>
        {value.platform}
      </a>
    ),
    videoEmbed: ({ value }) => (
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
        <iframe
          src={value.url}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
        />
      </div>
    ),
    image: ({ value }) => (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value.url}
        alt=""
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      />
    ),
    codeBlock: ({ value }) => (
      <pre style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', overflow: 'auto' }}>
        <code>{value.code}</code>
      </pre>
    ),
    componentSection: ({ value }) => (
      <div>
        <BasePortableText value={value.name || []} />
        <BasePortableText value={value.description || []} />
      </div>
    ),
  },
  marks: {
    link: ({ children, value }) => (
      <a href={value?.href} target={value?.blank ? '_blank' : undefined} rel={value?.blank ? 'noopener noreferrer' : undefined}>
        {children}
      </a>
    ),
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
  },
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h1: ({ children }) => <h1>{children}</h1>,
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
    h5: ({ children }) => <h5>{children}</h5>,
    h6: ({ children }) => <h6>{children}</h6>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
};

export function PortableText({ value, ...props }) {
  if (!value) return null;
  return <BasePortableText value={value} components={components} {...props} />;
}

// ptToText and textToPt are re-exported from lib/ptUtils.js above
