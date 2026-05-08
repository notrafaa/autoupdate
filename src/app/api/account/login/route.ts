import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/storage';

type AccountRecord = {
  id: string;
  username: string;
  password_hash: string;
  license_key: string | null;
  hwid: string | null;
};

type LicenseRecord = {
  key: string;
  duration_days: number | null;
  expires_at: string | null;
  status: string | null;
};

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

function formatRemaining(expiresAt: string | null, durationDays: number | null) {
  if (durationDays === null || durationDays === 0 || expiresAt === null) return 'Lifetime';

  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';

  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 31) return days === 1 ? '1 day' : `${days} days`;

  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1 month' : `${months} months`;

  const years = Math.floor(months / 12);
  return years === 1 ? '1 year' : `${years} years`;
}

async function getProfile(account: AccountRecord) {
  let license: LicenseRecord | null = null;

  if (account.license_key) {
    const { data } = await supabase
      .from('licenses')
      .select('key,duration_days,expires_at,status')
      .eq('key', account.license_key)
      .maybeSingle<LicenseRecord>();

    license = data ?? null;
  }

  return {
    username: account.username,
    licenseKey: account.license_key,
    remaining: license ? formatRemaining(license.expires_at, license.duration_days) : null,
    status: license?.status ?? null,
  };
}

export async function POST(request: NextRequest) {
  const { username, password, hwid } = await request.json();

  if (!username || !password || !hwid) {
    return NextResponse.json({ success: false, message: 'Username and password are required.' }, { status: 400 });
  }

  const { data: account, error } = await supabase
    .from('user_accounts')
    .select('id,username,password_hash,license_key,hwid')
    .eq('username', username)
    .maybeSingle<AccountRecord>();

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });

  if (!account || account.password_hash !== hashPassword(password)) {
    return NextResponse.json({ success: false, message: 'Invalid username or password.' }, { status: 401 });
  }

  if (account.hwid && account.hwid !== hwid) {
    return NextResponse.json({ success: false, message: 'This account is linked to another browser.' }, { status: 403 });
  }

  if (!account.hwid) {
    await supabase.from('user_accounts').update({ hwid }).eq('id', account.id);
  }

  return NextResponse.json({
    success: true,
    message: 'Logged in.',
    username: account.username,
    profile: await getProfile({ ...account, hwid: account.hwid ?? hwid }),
  });
}
