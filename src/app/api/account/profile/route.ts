import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/storage';

type AccountRecord = {
  id: string;
  username: string;
  license_key: string | null;
  hwid: string | null;
  avatar_url: string | null;
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
    avatarUrl: account.avatar_url || '/logo.png',
    licenseKey: account.license_key,
    remaining: license ? formatRemaining(license.expires_at, license.duration_days) : null,
    status: license?.status ?? null,
  };
}

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username')?.trim();
  const hwid = request.nextUrl.searchParams.get('hwid')?.trim();

  if (!username || !hwid) {
    return NextResponse.json({ success: false, message: 'Username and HWID are required.' }, { status: 400 });
  }

  const { data: account, error } = await supabase
    .from('user_accounts')
    .select('id,username,license_key,hwid,avatar_url')
    .eq('username', username)
    .maybeSingle<AccountRecord>();

  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  if (!account) return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });

  return NextResponse.json({ success: true, message: 'Profile loaded.', profile: await getProfile(account) });
}

export async function PATCH(request: NextRequest) {
  const { currentUsername, username, password, hwid } = await request.json();

  if (!currentUsername || !username || !hwid) {
    return NextResponse.json({ success: false, message: 'Username and HWID are required.' }, { status: 400 });
  }

  if (username.trim().length < 3) {
    return NextResponse.json({ success: false, message: 'Username must contain at least 3 characters.' }, { status: 400 });
  }

  if (password && password.length < 6) {
    return NextResponse.json({ success: false, message: 'Password must contain at least 6 characters.' }, { status: 400 });
  }

  const { data: account, error: accountError } = await supabase
    .from('user_accounts')
    .select('id,username,license_key,hwid')
    .eq('username', currentUsername)
    .maybeSingle<AccountRecord>();

  if (accountError) return NextResponse.json({ success: false, message: accountError.message }, { status: 500 });
  if (!account) return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });

  const updatePayload: { username: string; password_hash?: string; hwid: string } = {
    username: username.trim(),
    hwid,
  };

  if (password) {
    updatePayload.password_hash = hashPassword(password);
  }

  const { data: updated, error: updateError } = await supabase
    .from('user_accounts')
    .update(updatePayload)
    .eq('id', account.id)
    .select('id,username,license_key,hwid')
    .single<AccountRecord>();

  if (updateError) {
    return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Account updated.',
    username: updated.username,
    profile: await getProfile(updated),
  });
}
