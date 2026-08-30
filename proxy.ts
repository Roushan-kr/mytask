import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_SECRET_STR = process.env.AUTH_SECRET || 'fallback_development_secret_32_characters_minimum_len';
const SECRET_KEY = new TextEncoder().encode(AUTH_SECRET_STR);
const COOKIE_NAME = 'taskflow_session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets & api public check bypass
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/public') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      await jwtVerify(token, SECRET_KEY, { algorithms: ['HS256'] });
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  const isLoginPage = pathname === '/login';

  // If trying to access dashboard while unauthenticated -> Redirect to login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and on login page -> Redirect to main dashboard
  if (isAuthenticated && isLoginPage) {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
