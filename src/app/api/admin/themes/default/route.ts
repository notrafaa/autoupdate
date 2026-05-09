import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { logAdminAction } from '@/lib/cloud';
import { supabase } from '@/lib/storage';

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const { data: theme, error: themeError } = await supabase
      .from('cloud_themes')
      .select('id,name,status')
      .eq('id', id)
      .single();

    if (themeError) throw themeError;
    if (theme.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved themes can be set as default' }, { status: 400 });
    }

    await supabase
      .from('cloud_themes')
      .update({ is_default: false })
      .eq('is_default', true);

    const { error } = await supabase
      .from('cloud_themes')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
    await logAdminAction('theme_default', 'theme', theme.id, theme.name);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
