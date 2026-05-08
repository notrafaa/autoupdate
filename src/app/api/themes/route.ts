import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, author, payload, previewUrl } = body;

    if (!name || !payload) {
      return NextResponse.json(
        { success: false, error: 'Theme name and payload are required.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('cloud_themes')
      .insert({
        name,
        author: author ?? 'Anonymous',
        payload,
        preview_url: previewUrl ?? null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, theme: data }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }
}
