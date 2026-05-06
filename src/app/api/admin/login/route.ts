import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPassword } from '@/lib/auth';

export async function POST(request: Request) {
  const { password } = await request.json();
  const ADMIN_PASSWORD = getAdminPassword();

  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('admin_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
