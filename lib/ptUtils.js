// Pure PortableText utility functions — no React, safe in server components

// Render a PortableText value to a plain string (for SEO, alt text, titles, etc.)
export function ptToText(value) {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (!Array.isArray(value)) return '';
    return value
        .map(block => {
            if (block._type !== 'block' || !block.children) return '';
            return block.children.map(span => span.text || '').join('');
        })
        .join(' ')
        .trim();
}

// Wrap a plain string as a minimal PortableText array
export function textToPt(str) {
    if (!str) return [];
    return [{ _type: 'block', style: 'normal', children: [{ _type: 'span', text: String(str) }] }];
}
