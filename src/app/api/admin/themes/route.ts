import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { isCloudStatus, logAdminAction } from '@/lib/cloud';
import { supabase } from '@/lib/storage';

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('cloud_themes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, status } = await request.json();
  if (!id || !isCloudStatus(status)) {
    return NextResponse.json({ error: 'Valid id and status are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('cloud_themes')
    .update({ status })
    .eq('id', id)
    .select('id,name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction(`theme_${status}`, 'theme', data.id, data.name);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Theme id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('cloud_themes')
    .delete()
    .eq('id', id)
    .select('id,name')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAdminAction('theme_deleted', 'theme', data.id, data.name);
  return NextResponse.json({ success: true });
}
