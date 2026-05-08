import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/auth';
import { supabase } from '@/lib/storage';

function makeKey() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');

  return `LD-${segment()}-${segment()}-${segment()}-${segment()}`;
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const duration = body.duration === 'lifetime' ? 0 : Number(body.duration ?? 30);
  const count = Math.min(Math.max(Number(body.count ?? 1), 1), 250);

  const rows = Array.from({ length: count }, () => ({
    key: makeKey(),
    duration_days: duration,
    status: 'unused',
  }));

  const { data, error } = await supabase.from('licenses').insert(rows).select('*');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, keys: data ?? [] }, { status: 201 });
}
