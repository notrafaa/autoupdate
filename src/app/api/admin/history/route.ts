import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/storage';
import { isAuthenticated } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const history = await getHistory();
  return NextResponse.json(history);
}
