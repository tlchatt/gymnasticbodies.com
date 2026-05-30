import s from './Card.module.css';

/**
 * Card — dark bordered surface.
 *
 * Props:
 *   variant: 'default' | 'accent'   — accent adds orange tint + border
 *   padding: 'none' | 'sm' | 'md' | 'lg'   default: 'md'
 *   className: string   — extra classes to merge
 *   children: ReactNode
 *   ...rest: passed through to the wrapping <div>
 *
 * Usage:
 *   <Card>Plain dark card</Card>
 *   <Card variant="accent" padding="lg">Highlighted card</Card>
 *   <Card padding="none">Card with custom padding</Card>
 */
export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...rest
}) {
  const cls = [
    s.card,
    s[variant] ?? s.default,
    s[`pad${padding.charAt(0).toUpperCase() + padding.slice(1)}`] ?? s.padMd,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
