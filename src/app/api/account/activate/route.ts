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

function formatRemaining(expiresAt: string | null, durationDays: number | null) {
  if (durationDays === null || durationDays === 0 || expiresAt === null) return 'Lifetime';

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days === 1 ? '1 day' : `${days} days`;
}

export async function POST(request: NextRequest) {
  const { username, licenseKey, hwid } = await request.json();

  if (!username || !licenseKey || !hwid) {
    return NextResponse.json(
      { success: false, message: 'Username and license key are required.' },
      { status: 400 },
    );
  }

  const { data: account, error: accountError } = await supabase
    .from('user_accounts')
    .select('id,hwid')
    .eq('username', username)
    .maybeSingle();

  if (accountError) {
    return NextResponse.json({ success: false, message: accountError.message }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json(
      { success: false, message: 'Create your account before entering a license key.' },
      { status: 404 },
    );
  }

  if (account.hwid && account.hwid !== hwid) {
    return NextResponse.json(
      { success: false, message: 'This account is linked to another browser.' },
      { status: 403 },
    );
  }

  const { data: license, error: licenseError } = await supabase
    .from('licenses')
    .select('id,key,duration_days,expires_at,activated_at,hwid,status')
    .eq('key', licenseKey)
    .maybeSingle<LicenseRecord>();

  if (licenseError) {
    return NextResponse.json({ success: false, message: licenseError.message }, { status: 500 });
  }

  if (!license || license.status === 'revoked') {
    return NextResponse.json({ success: false, message: 'Invalid license key.' }, { status: 401 });
  }

  if (license.hwid && license.hwid !== hwid) {
    return NextResponse.json(
      { success: false, message: 'This license key is already linked to another machine.' },
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
    return NextResponse.json({ success: false, message: 'This license key has expired.' }, { status: 401 });
  }

  const { error: updateAccountError } = await supabase
    .from('user_accounts')
    .update({
      license_id: license.id,
      license_key: license.key,
      hwid,
    })
    .eq('id', account.id);

  if (updateAccountError) {
    return NextResponse.json({ success: false, message: updateAccountError.message }, { status: 500 });
  }

  await supabase
    .from('licenses')
    .update({
      hwid,
      activated_at: license.activated_at ?? now.toISOString(),
      expires_at: expiresAt,
      status: 'active',
    })
    .eq('id', license.id);

  return NextResponse.json({
    success: true,
    message: 'License activated. Download starting...',
    remaining: formatRemaining(expiresAt, license.duration_days),
  });
}
