import Link from 'next/link';
import s from './CtaButton.module.css';

/**
 * CtaButton — orange gradient button, usable as a <button> or <Link>.
 *
 * Props:
 *   href:      string   — if provided, renders as a Next.js <Link>
 *   onClick:   fn       — click handler (button mode only)
 *   variant:   'solid' | 'ghost'   default: 'solid'
 *   size:      'sm' | 'md' | 'lg'  default: 'md'
 *   disabled:  bool
 *   type:      'button' | 'submit'  default: 'button'
 *   fullWidth: bool     — stretches to container width
 *   children:  ReactNode
 *
 * Usage:
 *   <CtaButton href="/subscribe">Get Started</CtaButton>
 *   <CtaButton onClick={save} size="sm" disabled={saving}>Save</CtaButton>
 *   <CtaButton variant="ghost" href="/login">Sign In</CtaButton>
 */
export default function CtaButton({
  href,
  onClick,
  children,
  variant = 'solid',
  size = 'md',
  disabled,
  type = 'button',
  fullWidth,
  className = '',
  ...rest
}) {
  const cls = [
    s.btn,
    s[variant] ?? s.solid,
    s[size]    ?? s.md,
    fullWidth  ? s.fullWidth : '',
    disabled   ? s.disabled  : '',
    className,
  ].filter(Boolean).join(' ');

  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      {...rest}
    >
      {children}
    </button>
  );
}
