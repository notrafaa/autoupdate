import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getAppConfig } from '@/lib/storage';
import { supabase } from '@/lib/storage';

type AccountRecord = {
  id: string;
  username: string;
  password_hash: string;
  license_id: string | null;
  license_key: string | null;
};

type LicenseRecord = {
  id: string;
  key: string;
  duration_days: number | null;
  expires_at: string | null;
  activated_at: string | null;
  hwid: string | null;
  status: string | null;
};

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function formatRemaining(expiresAt: string | null, durationDays: number | null) {
  if (durationDays === null || durationDays === 0 || expiresAt === null) {
    return 'Lifetime';
  }

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days === 1 ? '1 day' : `${days} days`;
}

function authFailed(status: string, message: string, code = 401) {
  return NextResponse.json(
    { auth_success: false, success: false, status, message },
    { status: code },
  );
}

async function validateLicense(license: LicenseRecord | null, hwid?: string | null) {
  if (!license || license.status === 'revoked' || license.status === 'disabled') {
    return NextResponse.json(
      { auth_success: false, success: false, status: 'invalid_license', message: 'Invalid license.' },
      { status: 401 },
    );
  }

  if (license.status !== 'active') {
    return NextResponse.json(
      { auth_success: false, success: false, status: 'inactive_license', message: 'No active license.' },
      { status: 403 },
    );
  }

  if (hwid && license.hwid && license.hwid !== hwid) {
    return NextResponse.json(
      {
        auth_success: false,
        success: false,
        status: 'hwid_mismatch',
        message: 'This license is already linked to another machine.',
      },
      { status: 403 },
    );
  }

  const now = new Date();
  const expiresAt =
    license.expires_at ??
    (license.duration_days && license.duration_days > 0
      ? new Date(now.getTime() + license.duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null);

  if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
    await supabase.from('licenses').update({ status: 'expired' }).eq('id', license.id);
    return NextResponse.json({
      auth_success: false,
      success: false,
      status: 'expired',
      message: 'License expired.',
      remaining: 'Expired',
      expires_at: expiresAt,
    });
  }

  const updatePayload: Partial<Pick<LicenseRecord, 'activated_at' | 'expires_at' | 'hwid'>> = {};
  if (!license.activated_at) updatePayload.activated_at = now.toISOString();
  if (!license.expires_at) updatePayload.expires_at = expiresAt;
  if (hwid && !license.hwid) updatePayload.hwid = hwid;

  if (Object.keys(updatePayload).length > 0) {
    await supabase
      .from('licenses')
      .update(updatePayload)
      .eq('id', license.id);
  }

  const config = await getAppConfig();

  return NextResponse.json({
    auth_success: true,
    success: true,
    status: 'active',
    message: 'Authenticated',
    remaining: formatRemaining(expiresAt, license.duration_days),
    expires_at: expiresAt,
    license_key: license.key,
    download_url: config.mainFileUrl || '/api/download',
  });
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')?.trim();
  const password = request.nextUrl.searchParams.get('password') ?? '';
  const hwid = request.nextUrl.searchParams.get('hwid')?.trim();
  const key = request.nextUrl.searchParams.get('key')?.trim();

  if (username || password) {
    if (!username || !password || !hwid) {
      return authFailed('missing_credentials', 'Username, password and HWID are required.', 400);
    }

    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('id,username,password_hash,license_id,license_key')
      .eq('username', username)
      .maybeSingle<AccountRecord>();

    if (accountError) {
      return authFailed('server_error', accountError.message, 500);
    }

    if (!account || account.password_hash !== hashPassword(password)) {
      return authFailed('invalid_credentials', 'Invalid username or password.');
    }

    if (!account.license_id && !account.license_key) {
      return authFailed('no_license', 'No license is linked to this account.', 403);
    }

    let query = supabase
      .from('licenses')
      .select('id,key,duration_days,expires_at,activated_at,hwid,status');

    query = account.license_id
      ? query.eq('id', account.license_id)
      : query.eq('key', account.license_key);

    const { data: license, error: licenseError } = await query.maybeSingle<LicenseRecord>();

    if (licenseError) {
      return authFailed('server_error', licenseError.message, 500);
    }

    return validateLicense(license, hwid);
  }

  if (!key) {
    return authFailed('missing_credentials', 'Username/password/HWID or key is required.', 400);
  }

  const { data: license, error } = await supabase
    .from('licenses')
    .select('id,key,duration_days,expires_at,activated_at,hwid,status')
    .eq('key', key)
    .maybeSingle<LicenseRecord>();

  if (error) {
    return authFailed('server_error', error.message, 500);
  }

  return validateLicense(license);
}
