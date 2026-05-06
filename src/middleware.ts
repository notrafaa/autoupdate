import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Protect /admin but allow /admin/login
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const authCookie = request.cookies.get('admin_auth');
    const password = process.env.ADMIN_PASSWORD || 'changeme';

    if (!authCookie || authCookie.value !== password) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
