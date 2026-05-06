import { cookies } from 'next/headers';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const auth = cookieStore.get('admin_auth');
  return auth?.value === ADMIN_PASSWORD;
}

export function getAdminPassword() {
  return ADMIN_PASSWORD;
}
