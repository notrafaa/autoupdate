import { NextRequest, NextResponse } from 'next/server';
import { getAppConfig } from '@/lib/storage';
import { supabase } from '@/lib/storage';

type LicenseRecord = {
  id: string;
  key: string;
  duration_days: number | null;
  expires_at: string | null;
  activated_at: string | null;
  hwid: string | null;
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
  const hwid = request.nextUrl.searchParams.get('hwid')?.trim();

  if (!key || !hwid) {
    return NextResponse.json(
      { auth_success: false, status: 'missing_params', message: 'key and hwid are required.' },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from('licenses')
    .select('id,key,duration_days,expires_at,activated_at,hwid,status')
    .eq('key', key)
    .maybeSingle<LicenseRecord>();

  if (error) {
    return NextResponse.json(
      { auth_success: false, status: 'server_error', message: error.message },
      { status: 500 },
    );
  }

  if (!data || data.status === 'revoked') {
    return NextResponse.json({
      auth_success: false,
      status: 'invalid_key',
      message: 'License key is invalid or revoked.',
    });
  }

  if (data.hwid && data.hwid !== hwid) {
    return NextResponse.json({
      auth_success: false,
      status: 'hwid_mismatch',
      message: 'This key is already linked to another machine.',
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
      message: 'License key has expired.',
      remaining: 'Expired',
      expires_at: expiresAt,
    });
  }

  if (!data.activated_at || !data.hwid || !data.expires_at) {
    await supabase
      .from('licenses')
      .update({
        hwid,
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
    message: 'License valid. Download starts automatically.',
    remaining: formatRemaining(expiresAt, data.duration_days),
    expires_at: expiresAt,
    download_url: config.mainFileUrl || '/api/download',
  });
}
