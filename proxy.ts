import { NextRequest, NextResponse } from 'next/server';
import { jwtDecrypt } from 'jose';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') ?? '';

  // Legacy AWS API host (api.gymnasticbodies.com): the Spring backend was retired
  // (2026-08-17, prod Fargate scaled to zero). Rewrite EVERY path on that host to
  // the tombstone route, which records the hit (legacy_api.hit in app_logs) and
  // returns 410 Gone. Handled here in middleware because a next.config `has: host`
  // rewrite did not reliably match this host on Vercel (served a cached 404 instead).
  if (host === 'api.gymnasticbodies.com') {
    const url = request.nextUrl.clone();
    url.pathname = '/api/legacy' + (pathname === '/' ? '' : pathname);
    return NextResponse.rewrite(url);
  }

  // Everything below is admin-only gating. The matcher is now broad (so we can see
  // the api. host on any path), so short-circuit every non-admin path here.
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow login page through
  if (PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // better-auth prefixes cookie names with __Secure- when running on HTTPS
  const isSecure = (process.env.BETTER_AUTH_URL ?? '').startsWith('https://');
  const pfx = isSecure ? '__Secure-' : '';

  // Check for session token cookie
  const sessionToken = request.cookies.get(`${pfx}better-auth.session_token`)?.value;
  if (!sessionToken) {
    return redirectToLogin(request);
  }

  // Try to decode the JWE session cache to verify role=admin without a DB hit
  const sessionData = request.cookies.get(`${pfx}better-auth.session_data`)?.value;
  if (sessionData) {
    try {
      const secret = process.env.BETTER_AUTH_SECRET;
      if (!secret) return redirectToLogin(request);

      const key = new TextEncoder().encode(secret);
      const { payload } = await jwtDecrypt(sessionData, key);
      const user = (payload as any)?.user ?? (payload as any)?.session?.user;
      if (user?.role !== 'admin') {
        return redirectToLogin(request);
      }
      return NextResponse.next();
    } catch {
      // Cookie present but unreadable — fall through to allow the page-level check
    }
  }

  // Session token exists but no cached data (e.g. cache expired) — let the
  // page/route do the full DB-backed session check.
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Broadened so middleware can catch the api.gymnasticbodies.com host on any path.
  // Excludes Next internals, favicon, and /api/* — the real app API routes (incl. the
  // Stripe webhook) must not be wrapped, and legacy api. paths are all non-/api/ anyway.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
};
