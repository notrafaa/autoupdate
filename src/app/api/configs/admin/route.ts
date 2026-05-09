import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getStoredConfigs } from '@/lib/cloud';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json(await getStoredConfigs());
}
