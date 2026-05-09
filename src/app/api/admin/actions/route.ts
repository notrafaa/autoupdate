import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { getStoredAdminActions } from '@/lib/cloud';
import { supabase } from '@/lib/storage';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json(await getStoredAdminActions());
  return NextResponse.json(data ?? []);
}
