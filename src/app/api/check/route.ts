import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/storage';
import { supabase } from '@/lib/storage';

type LicenseRecord = {
  id: string;
  key: string;
  duration_days: number | null;
  expires_at: string | null;
  activated_at: string | null;
  status: string | null;
};

function formatRemaining(expiresAt: string | null, durationDays: number | null) {
  if (durationDays === null || durationDays === 0 || expiresAt === null) {
    return 'Lifetime';
  }

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days === 1 ? '1 day' : `${days} days`;
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get('key')?.trim();

  if (!key) {
    return NextResponse.json(
      { auth_success: false, status: 'invalid_key', message: 'Invalid license key' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('licenses')
    .select('id,key,duration_days,expires_at,activated_at,status')
    .eq('key', key)
    .maybeSingle<LicenseRecord>();

  if (error) {
    return NextResponse.json(
      { auth_success: false, status: 'server_error', message: error.message },
      { status: 500 },
    );
  }

  if (!data || data.status === 'revoked' || data.status === 'disabled') {
    return NextResponse.json({
      auth_success: false,
      status: 'invalid_key',
      message: 'Invalid license key',
    });
  }

  const now = new Date();
  const expiresAt =
    data.expires_at ??
    (data.duration_days && data.duration_days > 0
      ? new Date(now.getTime() + data.duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null);

  if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
    await supabase.from('licenses').update({ status: 'expired' }).eq('id', data.id);
    return NextResponse.json({
      auth_success: false,
      status: 'expired',
      message: 'Invalid license key',
      remaining: 'Expired',
      expires_at: expiresAt,
    });
  }

  if (!data.activated_at || !data.expires_at || data.status !== 'active') {
    await supabase
      .from('licenses')
      .update({
        activated_at: data.activated_at ?? now.toISOString(),
        expires_at: expiresAt,
        status: 'active',
      })
      .eq('id', data.id);
  }

  const config = await getAppConfig();

  return NextResponse.json({
    auth_success: true,
    status: 'active',
    message: 'Authenticated',
    remaining: formatRemaining(expiresAt, data.duration_days),
    expires_at: expiresAt,
    download_url: config.mainFileUrl || '/api/download',
  });
}
