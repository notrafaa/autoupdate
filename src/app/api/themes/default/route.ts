import { NextResponse } from 'next/server';
import { supabase } from '@/lib/storage';

export async function GET() {
  const { data, error } = await supabase
    .from('cloud_themes')
    .select('*')
    .eq('status', 'approved')
    .eq('is_default', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, error: 'No default theme found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, theme: data });
}
