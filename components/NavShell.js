'use client';
import { usePathname } from 'next/navigation';
import DarkNav from './DarkNav';

/**
 * NavShell — renders DarkNav for all routes except those that
 * manage their own navigation:
 *   /admin/*  → uses AdminNav sidebar (app/admin/layout.js)
 *   /renew    → manages its own DarkNav with userDisplay prop
 */
const SELF_MANAGED_PREFIXES = ['/admin', '/renew'];

export default function NavShell() {
  const pathname = usePathname();
  if (SELF_MANAGED_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <DarkNav />;
}
