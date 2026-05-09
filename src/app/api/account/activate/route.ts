import { NextRequest, NextResponse } from 'next/server';
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

type AccountRecord = {
  id: string;
  license_id: string | null;
  license_key: string | null;
};

function formatRemaining(expiresAt: string | null, durationDays: number | null) {
  if (durationDays === null || durationDays === 0 || expiresAt === null) return 'Lifetime';

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days === 1 ? '1 day' : `${days} days`;
}

export async function POST(request: NextRequest) {
  const { username, licenseKey } = await request.json();

  if (!username || !licenseKey) {
    return NextResponse.json(
      { success: false, message: 'Username and license key are required.' },
      { status: 400 },
    );
  }

  const { data: account, error: accountError } = await supabase
    .from('user_accounts')
    .select('id,license_id,license_key')
    .eq('username', username)
    .maybeSingle<AccountRecord>();

  if (accountError) {
    return NextResponse.json({ success: false, message: accountError.message }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json(
      { success: false, message: 'Create your account before entering a license key.' },
      { status: 404 },
    );
  }

  if (account.license_id || account.license_key) {
    let currentLicense: { status: string | null } | null = null;

    if (account.license_id) {
      const { data } = await supabase
        .from('licenses')
        .select('status')
        .eq('id', account.license_id)
        .maybeSingle<{ status: string | null }>();
      currentLicense = data ?? null;
    } else if (account.license_key) {
      const { data } = await supabase
        .from('licenses')
        .select('status')
        .eq('key', account.license_key)
        .maybeSingle<{ status: string | null }>();
      currentLicense = data ?? null;
    }

    if (currentLicense && currentLicense.status !== 'disabled' && currentLicense.status !== 'unused') {
      return NextResponse.json(
        { success: false, message: 'This account already has an active license.' },
        { status: 409 },
      );
    }
  }

  const { data: license, error: licenseError } = await supabase
    .from('licenses')
    .select('id,key,duration_days,expires_at,activated_at,hwid,status')
    .eq('key', licenseKey)
    .maybeSingle<LicenseRecord>();

  if (licenseError) {
    return NextResponse.json({ success: false, message: licenseError.message }, { status: 500 });
  }

  if (!license || license.status === 'revoked' || license.status === 'disabled') {
    return NextResponse.json({ success: false, message: 'Invalid license key.' }, { status: 401 });
  }

  if (license.status === 'active' || license.hwid) {
    return NextResponse.json(
      { success: false, message: 'This license key has already been redeemed.' },
      { status: 409 },
    );
  }

  const now = new Date();
  const expiresAt =
    license.expires_at ??
    (license.duration_days && license.duration_days > 0
      ? new Date(now.getTime() + license.duration_days * 24 * 60 * 60 * 1000).toISOString()
      : null);

  if (expiresAt && new Date(expiresAt).getTime() <= now.getTime()) {
    return NextResponse.json({ success: false, message: 'This license key has expired.' }, { status: 401 });
  }

  const { error: updateAccountError } = await supabase
    .from('user_accounts')
    .update({
      license_id: license.id,
      license_key: license.key,
    })
    .eq('id', account.id);

  if (updateAccountError) {
    return NextResponse.json({ success: false, message: updateAccountError.message }, { status: 500 });
  }

  await supabase
    .from('licenses')
    .update({
      activated_at: license.activated_at ?? now.toISOString(),
      expires_at: expiresAt,
      status: 'active',
    })
    .eq('id', license.id);

  return NextResponse.json({
    success: true,
    message: 'License activated.',
    remaining: formatRemaining(expiresAt, license.duration_days),
    licenseKey: license.key,
  });
}
