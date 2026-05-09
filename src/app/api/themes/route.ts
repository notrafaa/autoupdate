import { NextRequest, NextResponse } from 'next/server';
import { normalizeThemePayload } from '@/lib/cloud';
import { supabase } from '@/lib/storage';

export async function GET() {
  const { data, error } = await supabase
    .from('cloud_themes')
    .select('id,name,author,payload,preview_url,is_default,created_at')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });

  const themes = (data ?? [])
    .map((theme) => ({ ...theme, payload: normalizeThemePayload(theme.payload) }))
    .filter((theme) => theme.payload !== null);

  return NextResponse.json({ success: true, themes });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, author, payload, previewUrl } = body;

    const normalizedPayload = normalizeThemePayload(payload);

    if (!name || !normalizedPayload) {
      return NextResponse.json(
        { success: false, error: 'Theme name and valid hex color payload are required.' },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from('cloud_themes')
      .insert({
        name: String(name).trim(),
        author: author ?? 'Anonymous',
        payload: normalizedPayload,
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
