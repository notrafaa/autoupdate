import { NextRequest, NextResponse } from 'next/server';
import { supabaseClient } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Reset all to not default
    await supabaseClient.from('cloud_themes').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Set the specific one to default
    const { error } = await supabaseClient
      .from('cloud_themes')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
