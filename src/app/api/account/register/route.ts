import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/storage';

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

export async function POST(request: NextRequest) {
  const { username, password, hwid } = await request.json();

  if (!username || !password || !hwid) {
    return NextResponse.json(
      { success: false, message: 'Username and password are required.' },
      { status: 400 },
    );
  }

  if (username.length < 3 || password.length < 6) {
    return NextResponse.json(
      { success: false, message: 'Username must be 3+ chars and password 6+ chars.' },
      { status: 400 },
    );
  }

  const { data: existingAccount } = await supabase
    .from('user_accounts')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existingAccount) {
    return NextResponse.json(
      { success: false, message: 'This username is already taken.' },
      { status: 409 },
    );
  }

  const { error } = await supabase.from('user_accounts').insert({
    username,
    password_hash: hashPassword(password),
    hwid,
  });

  if (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Account created. Enter your license key to continue.',
  });
}
