import { NextRequest, NextResponse } from 'next/server';
import { jwtDecrypt } from 'jose';

const PUBLIC_ADMIN_PATHS = ['/admin/login'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ['/admin/:path*'],
};
